"""
NeuralCode Agent — autonomous, multi-tool execution loop.

Design principles:
- Explicit planning phases emitted to the frontend.
- One tool per model turn; result fed back before the next turn.
- Retries on failed tool calls (up to MAX_TOOL_RETRIES).
- Session file context: every file read, patched, or created is cached and
  re-injected into every subsequent tool-result message so the model always
  has full context without re-reading.
- Smart context trimming preserves the system prompt and recent history.
- Completion only when COMPLETION_MARKER is present and no pending tools remain.
"""

import asyncio
import json
import re
import uuid
from typing import Dict, List, Tuple

from openai import APIError, APIStatusError

from tools.registry import tool_map
from workspace import read_file as workspace_read_file

# ── Tag → Tool mapping ────────────────────────────────────────────────────────
TAG_TO_TOOL: Dict[str, str] = {
    "Call_Tool_List_Files": "list_files",
    "read_content_file":    "read_file",
    "search_in_files":      "search_files",
    "patch_file":           "patch_file",
    "rename_file":          "rename_file",
    "lines_editor":         "lines_editor",
    "create_file":          "write_file",
    "run_command":          "run_command",
}

# Robust tag-opener: handles > and newlines inside quoted attribute values.
# Pattern: <TagName (attr="value with > or \n inside")* />? >
OPEN_TAG_RE = re.compile(
    r'<([A-Za-z_][\w\-]*)'
    r'((?:\s+[A-Za-z_][\w\-]*\s*=\s*(?:"[^"]*"|\'[^\']*\'))*)'
    r'\s*/?>'
    , re.DOTALL
)
ATTR_RE = re.compile(
    r'([A-Za-z_][\w\-]*)\s*=\s*"([^"]*)"|([A-Za-z_][\w\-]*)\s*=\s*\'([^\']*)\''
    , re.DOTALL  # allow newlines inside attribute values
)

MAX_RESULT_TEXT           = 12000
MAX_MESSAGES              = 40
MAX_STEPS                 = 80
MAX_TOOL_RETRIES          = 2
MAX_DUPLICATE_CALLS       = 1
MAX_TAG_RECOVERY_ATTEMPTS = 2       # retries when a tool tag is malformed
COMPLETION_MARKER         = "task_status=completed"
DEFAULT_MAX_OUTPUT_TOKENS = 16384

# Max characters of a single cached file included in the session context block
SESSION_FILE_PREVIEW = 6000

# Injected when a tool tag was detected in the model output but failed to parse
_MALFORMED_TAG_RECOVERY_MSG = """\
Your last tool tag was malformed — the parser could not extract it. This means no \
tool was executed.

**Root cause:** `<{tag}>` attributes almost certainly contain `>`, `<`, newlines, \
HTML, JSX, TypeScript generics (`Array<T>`), or multi-line replacement text — all of \
which corrupt XML attribute parsing.

**Immediate fix — switch to `<lines_editor>`:**
1. Read the exact line numbers first:
   `<read_content_file path="..." from_lines="N" to_lines="M"></read_content_file>`
2. Then replace using the JSON body (safe for ALL characters — `>`, `<`, HTML, JSX, newlines):
```
<lines_editor path="same/file">
[{{"op": "replace", "start_line": N, "end_line": M, "content": "exact replacement\\n"}}]
</lines_editor>
```

Do NOT retry `<patch_file>` for this content. Emit `<read_content_file>` now to get \
line numbers, then use `<lines_editor>`.\
"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _detect_malformed_attempt(text: str) -> str | None:
    """
    Check if the model output contains a tool tag opening that failed to parse.
    This happens when a tag's attributes contain > < newlines or other XML-breaking
    characters. Returns the offending tag name, or None if no attempt is detected.
    """
    for tag_name in TAG_TO_TOOL:
        if f"<{tag_name}" in text:
            return tag_name
    return None


def _parse_attributes(raw: str) -> Dict[str, str]:
    attrs: Dict[str, str] = {}
    for m in ATTR_RE.finditer(raw or ""):
        key = m.group(1) or m.group(3)
        val = m.group(2) if m.group(2) is not None else (m.group(4) or "")
        if key:
            attrs[key] = val
    return attrs


def _truncate(value: str, limit: int = MAX_RESULT_TEXT) -> str:
    if not isinstance(value, str) or len(value) <= limit:
        return value
    return value[:limit] + f"\n…[{len(value) - limit} chars truncated]"


def _compact_result(result: Dict) -> Dict:
    compact: Dict = {}
    for k, v in (result or {}).items():
        if k in ("content", "preview", "stdout", "stderr",
                 "original_content", "modified_content", "diff_preview"):
            compact[k] = _truncate(v)
        elif k == "matches" and isinstance(v, list):
            compact[k] = v[:20]
            if len(v) > 20:
                compact["matches_truncated"] = len(v) - 20
        elif k == "files" and isinstance(v, list):
            compact[k] = v[:60]
            if len(v) > 60:
                compact["files_truncated"] = len(v) - 60
        else:
            compact[k] = v
    return compact


def _trim_messages(messages: List[Dict]) -> List[Dict]:
    if len(messages) <= MAX_MESSAGES:
        return messages
    system = messages[0] if messages and messages[0].get("role") == "system" else None
    keep = MAX_MESSAGES - (1 if system else 0)
    tail = messages[-keep:]
    return ([system] + tail) if system else tail


def _strip_tool_tags(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(
        r"<([A-Za-z_][\w\-]*)\s*[^>]*>.*?</\1>", "", text, flags=re.DOTALL
    )
    cleaned = re.sub(r"<([A-Za-z_][\w\-]*)\s*[^>]*/>", "", cleaned)
    # Also strip the completion marker so it doesn't pollute conversation history
    cleaned = cleaned.replace(COMPLETION_MARKER, "").strip()
    return cleaned


# ── Session file context ───────────────────────────────────────────────────────

def _build_session_context(
    file_cache: Dict[str, str],
    edited_files: set,
    created_files: set,
    searched_queries: List[str],
) -> str:
    """
    Build the session context block injected into every tool-result message.
    Includes the current content of every file the agent has touched this session.
    """
    lines: List[str] = []

    if file_cache:
        lines.append("## SESSION FILE CONTEXT")
        lines.append("The following files have been accessed or modified this session.")
        lines.append("Use this content directly — do NOT re-read these files.\n")
        for path, content in file_cache.items():
            if path in created_files:
                status = "CREATED"
            elif path in edited_files:
                status = "MODIFIED"
            else:
                status = "READ"
            truncated = (
                content[:SESSION_FILE_PREVIEW] + f"\n…[{len(content) - SESSION_FILE_PREVIEW} chars truncated]"
                if len(content) > SESSION_FILE_PREVIEW
                else content
            )
            lines.append(f"### [{status}] `{path}`")
            lines.append(f"```\n{truncated}\n```\n")

    if searched_queries:
        recent = searched_queries[-8:]
        quoted = ", ".join('"' + q + '"' for q in recent)
        lines.append(f"## Searched this session: {quoted}")
        lines.append("Do NOT repeat any of these searches.\n")

    return "\n".join(lines)


# ── Block extraction ──────────────────────────────────────────────────────────

def _extract_closed_blocks(text: str) -> List[Dict]:
    """Parse all complete XML-like tool tag blocks from model output."""
    blocks: List[Dict] = []
    cursor = 0
    while True:
        open_m = OPEN_TAG_RE.search(text, cursor)
        if not open_m:
            break
        tag_name = open_m.group(1)
        if tag_name not in TAG_TO_TOOL:
            cursor = open_m.end()
            continue

        is_self_closing = open_m.group(0).rstrip().endswith("/>")
        close_tag = f"</{tag_name}>"
        close_idx = text.find(close_tag, open_m.end())

        if is_self_closing and tag_name in ("create_file", "lines_editor", "patch_file"):
            cursor = open_m.end()
            continue

        if close_idx == -1 and not is_self_closing:
            cursor = open_m.end()
            continue

        payload = "" if is_self_closing or close_idx == -1 else text[open_m.end():close_idx]
        next_cursor = open_m.end() if (is_self_closing and close_idx == -1) else (
            close_idx + len(close_tag)
        )

        blocks.append({
            "start":       open_m.start(),
            "tag_name":    tag_name,
            "tool_name":   TAG_TO_TOOL[tag_name],
            "attributes":  _parse_attributes(open_m.group(2)),
            "payload":     payload.strip("\n"),
            "opening_tag": open_m.group(0),
            "close_end":   next_cursor,
        })
        cursor = next_cursor
    return blocks


# ── Tool execution ────────────────────────────────────────────────────────────

async def _execute_tagged_tool(block: Dict) -> Dict:
    tag_name  = block["tag_name"]
    tool_name = block["tool_name"]
    attrs     = block["attributes"]
    payload   = block["payload"]

    if tool_name not in tool_map:
        return {"error": f"Unknown tool for tag <{tag_name}>"}

    fn = tool_map[tool_name]["execute"]

    # list_files
    if tag_name == "Call_Tool_List_Files":
        return await fn()

    # search_in_files
    if tag_name == "search_in_files":
        query = attrs.get("query", "").strip()
        if not query:
            return {"error": "Missing required attribute: query"}
        return await fn(query=query, max_results=int(attrs.get("max_results", "100")))

    # read_content_file
    if tag_name == "read_content_file":
        path = attrs.get("path", "").strip()
        if not path:
            return {"error": "Missing required attribute: path"}
        raw = await fn(path=path)
        content = raw.get("content", "")
        lines   = content.splitlines()
        start   = max(1, int(attrs.get("from_lines", "1")))
        end_val = attrs.get("to_lines")
        end     = int(end_val) if end_val else len(lines)
        sliced  = "\n".join(lines[start - 1 : max(start - 1, end)])
        return {
            "path":        path,
            "content":     sliced,
            "from_lines":  start,
            "to_lines":    end,
            "total_lines": len(lines),
        }

    # patch_file — surgical search-and-replace
    if tag_name == "patch_file":
        path = attrs.get("path", "").strip()
        if not path:
            return {"error": "Missing required attribute: path"}
        search_text  = attrs.get("search", "")
        replace_text = attrs.get("replace", "")
        if not search_text:
            return {"error": "Missing required attribute: search"}
        return await fn(path=path, search=search_text, replace=replace_text)

    # rename_file — move or rename a file within the workspace
    if tag_name == "rename_file":
        path = attrs.get("path", "").strip()
        new_path = attrs.get("new_path", "").strip()
        if not path:
            return {"error": "Missing required attribute: path"}
        if not new_path:
            return {"error": "Missing required attribute: new_path"}
        return await fn(path=path, new_path=new_path)

    # lines_editor — line-based surgical edits
    if tag_name == "lines_editor":
        path = attrs.get("path", "").strip()
        if not path:
            return {"error": "Missing required attribute: path"}
        if not payload.strip():
            return {"error": "<lines_editor> requires a JSON operations array as body content.", "success": False}
        return await fn(path=path, operations_json=payload)

    # create_file — full content write (new files only)
    if tag_name == "create_file":
        path = attrs.get("path", "").strip()
        if not path:
            return {"error": "Missing required attribute: path"}
        if not payload.strip():
            return {"error": "<create_file> requires non-empty body content.", "success": False}
        await fn(path=path, content=payload)
        return {
            "status":    "saved",
            "path":      path,
            "operation": "create",
            "lines":     payload.count("\n") + 1,
        }

    # run_command
    if tag_name == "run_command":
        command = attrs.get("command", "").strip() or payload.strip()
        if not command:
            return {"error": "Missing required attribute: command"}
        timeout = int(attrs.get("timeout", "30"))
        return await fn(command=command, timeout=timeout)

    return {"error": f"Unsupported tag: <{tag_name}>"}


async def _execute_with_retry(block: Dict, retries: int = MAX_TOOL_RETRIES) -> Tuple[Dict, bool]:
    """Execute a tool block with automatic retries. Returns (result, success)."""
    last_result: Dict = {}
    for attempt in range(retries + 1):
        result = await _execute_tagged_tool(block)
        last_result = result
        has_error = "error" in result and result.get("success", True) is False
        if not has_error or attempt == retries:
            break
        await asyncio.sleep(0.2)
    success = "error" not in last_result or last_result.get("success", True) is not False
    return last_result, success


# ── Planning phase emitters ───────────────────────────────────────────────────

def _phase_event(phase: str, label: str) -> Dict:
    return {"type": "agent_phase", "phase": phase, "label": label}


# ── Main agent loop ───────────────────────────────────────────────────────────

async def run_agent(
    client,
    model: str,
    messages: List[Dict],
    mode: str = "agent",
    max_output_tokens: int = DEFAULT_MAX_OUTPUT_TOKENS,
):
    """
    Autonomous agentic execution loop with explicit planning phases.
    Streams events to the caller (FastAPI SSE layer).
    """
    mode = (mode or "agent").strip().lower()
    yield {"type": "task_status", "status": "pending"}
    yield _phase_event("analyzing", "Analyzing task…")

    seen_calls: Dict[str, int] = {}
    recovery_attempts: int     = 0     # malformed tag auto-recovery counter

    # Session tracking — for full file context injection
    file_cache: Dict[str, str]  = {}   # path → current content (read or created)
    edited_files: set            = set()
    created_files: set           = set()
    searched_queries: List[str]  = []

    for step in range(MAX_STEPS):
        messages = _trim_messages(messages)

        if step > 0:
            yield _phase_event("planning", "Planning next move…")

        # ── Call the model ─────────────────────────────────────────────────
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                max_tokens=max_output_tokens,
            )
        except APIStatusError as e:
            err = str(e)
            if "413" in err or "Request too large" in err:
                sys_msg = next((m for m in messages if m.get("role") == "system"), None)
                tail = messages[-8:]
                messages = ([sys_msg] + tail) if sys_msg else tail
                yield {"type": "content", "content": "\n[context trimmed — token limit]\n"}
                continue
            if "max_tokens" in err.lower() or "maximum" in err.lower():
                try:
                    response = await client.chat.completions.create(
                        model=model,
                        messages=messages,
                        stream=True,
                    )
                except APIError as e2:
                    yield {"type": "final", "content": f"[Model error] {e2}"}
                    return
            else:
                yield {"type": "final", "content": f"[Model error] {err}"}
                return
        except APIError as e:
            yield {"type": "final", "content": f"[Model error] {e}"}
            return

        # ── Stream the model response ──────────────────────────────────────
        full_content = ""
        announced_blocks: Dict[int, str] = {}
        finish_reason: str | None = None

        try:
            async for chunk in response:
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                if choice.finish_reason:
                    finish_reason = choice.finish_reason
                delta = choice.delta
                if not delta.content:
                    continue
                full_content += delta.content
                yield {"type": "content", "content": delta.content}

                for open_m in OPEN_TAG_RE.finditer(full_content):
                    tag_name = open_m.group(1)
                    if tag_name not in TAG_TO_TOOL:
                        continue
                    pos = open_m.start()
                    if pos in announced_blocks:
                        continue
                    block_id = str(uuid.uuid4())
                    announced_blocks[pos] = block_id
                    yield {
                        "type":         "tool_block_start",
                        "tool_call_id": block_id,
                        "tag_name":     tag_name,
                        "tool_name":    TAG_TO_TOOL[tag_name],
                        "attributes":   _parse_attributes(open_m.group(2)),
                        "opening_tag":  open_m.group(0),
                    }
        except APIError as e:
            # Close every announced-but-unexecuted tool card so they don't stay "running"
            for bid in announced_blocks.values():
                yield {
                    "type": "tool_result", "tool_call_id": bid,
                    "result": {"error": "Stream interrupted — tool was not executed.", "success": False},
                }
            messages.append({
                "role":    "user",
                "content": (
                    "Stream interrupted. Resume using only XML-like tool tags. "
                    "Do NOT use native function-calling. Continue the task."
                ),
            })
            yield {"type": "content", "content": f"\n[stream recovered]\n"}
            continue
        except Exception as e:
            for bid in announced_blocks.values():
                yield {
                    "type": "tool_result", "tool_call_id": bid,
                    "result": {"error": f"Stream error: {e}", "success": False},
                }
            yield {"type": "final", "content": f"[Agent stream error] {e}"}
            return

        # Handle output token limit cutoff
        if finish_reason == "length":
            # Close announced blocks — they can't execute in this truncated turn
            for bid in announced_blocks.values():
                yield {
                    "type": "tool_result", "tool_call_id": bid,
                    "result": {"error": "Response was cut off — tool not executed.", "success": False},
                }
            messages.append({"role": "assistant", "content": full_content or "[truncated]"})
            messages.append({
                "role":    "user",
                "content": (
                    "Your previous response was cut off at the output token limit. "
                    "Continue exactly from where you left off without repeating any content. "
                    "If you were writing file content inside a tool tag, resume the content and close the tag properly."
                ),
            })
            yield {"type": "content", "content": "\n"}
            continue

        # Ask mode: single-turn, no tools
        if mode == "ask":
            yield {"type": "final", "content": _strip_tool_tags(full_content) or full_content}
            return

        blocks = _extract_closed_blocks(full_content)

        # ── Close orphaned tool announcements ─────────────────────────────────
        # Every tool_block_start must have a matching tool_result.
        # Only blocks[0] will be executed; close out every other announced block.
        executed_start = blocks[0]["start"] if blocks else None
        for pos, bid in announced_blocks.items():
            if pos == executed_start:
                continue  # this one will get a real tool_result below
            result = (
                {"info": "Skipped — only the first tool per response is executed."}
                if executed_start is not None
                else {"error": "Tool tag was incomplete or malformed.", "success": False}
            )
            yield {"type": "tool_result", "tool_call_id": bid, "result": result}

        # Store assistant turn as text only (strip tool tags so history stays clean)
        assistant_text = _strip_tool_tags(full_content).strip()
        messages.append({
            "role":    "assistant",
            "content": assistant_text or "\u00b7",
        })

        # No tool blocks this turn
        if not blocks:
            stripped = assistant_text
            lower = full_content.lower()

            if COMPLETION_MARKER in full_content:
                yield {"type": "task_status", "status": "completed"}
                yield _phase_event("done", "Task completed.")
                yield {"type": "final", "content": stripped or full_content}
                return

            # ── Malformed tag auto-recovery ───────────────────────────────
            # If the response contained a tool tag opening (<patch_file etc.)
            # but nothing parsed, the tag was almost certainly malformed
            # (attributes with > < or newlines). Inject a targeted correction
            # and let the model retry — up to MAX_TAG_RECOVERY_ATTEMPTS times.
            malformed_tag = _detect_malformed_attempt(full_content)
            if malformed_tag and recovery_attempts < MAX_TAG_RECOVERY_ATTEMPTS:
                recovery_attempts += 1
                yield _phase_event(
                    "recovering",
                    f"Malformed <{malformed_tag}> — retrying with lines_editor… ({recovery_attempts}/{MAX_TAG_RECOVERY_ATTEMPTS})",
                )
                recovery_note = (
                    f"\n\n⚠️ `<{malformed_tag}>` tag was malformed and could not execute "
                    f"(attempt {recovery_attempts}). Switching to `<lines_editor>`…\n\n"
                )
                yield {"type": "content", "content": recovery_note}
                messages.append({
                    "role":    "user",
                    "content": _MALFORMED_TAG_RECOVERY_MSG.format(tag=malformed_tag),
                })
                continue

            ACTIVE_WORK_SIGNALS = (
                "root cause", "target files", "phase 1", "phase 2",
                "will search", "will read", "will edit", "will run",
                "let me search", "let me read", "let me check", "let me look",
                "searching for", "reading file", "investigating",
                "starting with", "next i will", "now i will",
            )
            has_active_work_signal = any(s in lower for s in ACTIVE_WORK_SIGNALS)

            DONE_SIGNALS = (
                "please clarify", "could you", "do you want", "which", "what type",
                "how can i help", "how may i help", "what would you like",
                "what can i", "what do you need", "tell me more",
                "hello", "hi there", "hey there", "greetings",
                "i'm here to help", "i'm ready", "happy to help", "ready to help",
                "you're welcome", "you are welcome", "glad to help",
                "let me know if", "feel free to", "anything else",
                "no workspace", "no files", "no task", "not sure what",
            )
            has_done_signal = any(s in lower for s in DONE_SIGNALS)

            is_self_contained = (
                ("?" in full_content or has_done_signal)
                and not has_active_work_signal
            )
            is_short_non_task = (
                len(stripped.split()) <= 80
                and not has_active_work_signal
                and step == 0
            )

            if is_self_contained or is_short_non_task:
                yield {"type": "final", "content": stripped or full_content}
                return

            messages.append({
                "role":    "user",
                "content": (
                    "Continue the coding task. Use exactly ONE tool tag in your next response. "
                    "When ALL work is fully complete, end (with no tool tags) with:\n"
                    f"  {COMPLETION_MARKER}"
                ),
            })
            continue

        # ── Execute the first tool block (one tool per turn) ───────────────
        yield _phase_event("executing", "Executing tool…")

        block = blocks[0]
        block["id"] = announced_blocks.get(block["start"], str(uuid.uuid4()))

        # Duplicate-call guard (ignores line-range attributes)
        attrs_for_key = {k: v for k, v in block["attributes"].items()
                         if k not in ("from_lines", "to_lines")}
        call_key = (
            f"{block['tag_name']}|"
            f"{json.dumps(attrs_for_key, sort_keys=True)}|"
            f"{block['payload'][:120]}"
        )
        seen_calls[call_key] = seen_calls.get(call_key, 0) + 1
        if seen_calls[call_key] > MAX_DUPLICATE_CALLS:
            yield {
                "type":         "tool_result",
                "tool_call_id": block["id"],
                "result": {
                    "error": (
                        f"Duplicate call blocked — <{block['tag_name']}> with the same target "
                        f"was already called {seen_calls[call_key] - 1} time(s). Move to the next step."
                    )
                },
            }
            messages.append({
                "role":    "user",
                "content": (
                    f"Blocked: you already called <{block['tag_name']}> with identical arguments. "
                    "Do NOT repeat it. Refer to SESSION FILE CONTEXT for cached file contents. "
                    "Move to the next step or end with:\n"
                    f"  {COMPLETION_MARKER}"
                ),
            })
            continue

        yield {
            "type":         "tool_block",
            "tool_call_id": block["id"],
            "tag_name":     block["tag_name"],
            "tool_name":    block["tool_name"],
            "attributes":   block["attributes"],
            "payload":      block["payload"],
            "opening_tag":  block["opening_tag"],
        }
        yield {
            "type":          "tool_loading",
            "tool_call_id":  block["id"],
            "tool_name":     block["tool_name"],
            "tag_name":      block["tag_name"],
            "is_loading":    True,
            "delay_seconds": 0,
        }

        result, success = await _execute_with_retry(block)

        # Successful tool execution — reset malformed-tag recovery counter so
        # each distinct step gets fresh recovery attempts.
        if success:
            recovery_attempts = 0

        # ── Update session file cache ──────────────────────────────────────
        file_path_used = block["attributes"].get("path", "")

        if block["tag_name"] == "read_content_file" and file_path_used:
            content_val = result.get("content", "")
            if content_val:
                file_cache[file_path_used] = content_val

        elif block["tag_name"] == "patch_file" and file_path_used and result.get("success"):
            edited_files.add(file_path_used)
            # Refresh cache: read the patched file's new content via workspace
            try:
                refreshed = workspace_read_file(file_path_used)
                if isinstance(refreshed, dict):
                    refreshed = refreshed.get("content", "")
                if refreshed:
                    file_cache[file_path_used] = refreshed
            except Exception:
                file_cache.pop(file_path_used, None)

        elif block["tag_name"] == "lines_editor" and file_path_used:
            edited_files.add(file_path_used)
            # Refresh cache after edit
            try:
                refreshed = workspace_read_file(file_path_used)
                if isinstance(refreshed, dict):
                    refreshed = refreshed.get("content", "")
                if refreshed:
                    file_cache[file_path_used] = refreshed
            except Exception:
                file_cache.pop(file_path_used, None)

        elif block["tag_name"] == "create_file" and file_path_used:
            created_files.add(file_path_used)
            file_cache[file_path_used] = block["payload"]

        elif block["tag_name"] == "rename_file" and result.get("success"):
            old_path = block["attributes"].get("path", "")
            new_path_val = block["attributes"].get("new_path", "")
            # Move cached content to the new path, drop the old entry
            if old_path in file_cache:
                file_cache[new_path_val] = file_cache.pop(old_path)
            edited_files.discard(old_path)
            edited_files.add(new_path_val)

        elif block["tag_name"] == "search_in_files":
            query_used = block["attributes"].get("query", "").strip()
            if query_used and query_used not in searched_queries:
                searched_queries.append(query_used)

        # Emit live context state so the frontend panel stays up to date
        yield {
            "type": "context_update",
            "files": [
                {
                    "path": p,
                    "chars": len(c),
                    "tokens": max(1, len(c) // 4),
                    "action": (
                        "created" if p in created_files
                        else "edited" if p in edited_files
                        else "read"
                    ),
                }
                for p, c in file_cache.items()
            ],
            "searched_queries": list(searched_queries),
            "total_chars": sum(len(c) for c in file_cache.values()),
        }

        yield {"type": "tool_result", "tool_call_id": block["id"], "result": result}

        compact = _compact_result(result)
        status_note = "" if success else " [FAILED — fix and retry with corrected arguments]"

        # Build the session context block (full file contents + search history)
        session_ctx = _build_session_context(file_cache, edited_files, created_files, searched_queries)

        messages.append({
            "role":    "user",
            "content": (
                f"<tool_result tag=\"{block['tag_name']}\" path=\"{file_path_used}\"{status_note}>\n"
                f"{json.dumps(compact)}\n"
                f"</tool_result>\n\n"
                f"{session_ctx}\n\n"
                "State your NEXT action in one sentence, then use exactly ONE tool tag. "
                "Do NOT re-read or re-search anything already in SESSION FILE CONTEXT above. "
                f"When all work is done, end with:\n  {COMPLETION_MARKER}"
            ),
        })

    yield {"type": "final", "content": f"Agent reached the {MAX_STEPS}-step limit without completing."}
