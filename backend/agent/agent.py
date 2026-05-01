"""
NeuralCode Agent — autonomous, multi-tool execution loop.

Design principles:
- Explicit planning phases emitted to the frontend (analyzing → planning → executing → done).
- Processes all tool blocks found in each model turn sequentially.
- Retries failed tool calls up to MAX_TOOL_RETRIES times.
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
    "lines_editor":         "lines_editor",
    "create_file":          "write_file",
    "run_command":          "run_command",
}

OPEN_TAG_RE = re.compile(r"<([A-Za-z_][\w\-]*)\s*([^>]*)>")
ATTR_RE = re.compile(
    r'([A-Za-z_][\w\-]*)\s*=\s*"([^"]*)"|([A-Za-z_][\w\-]*)\s*=\s*\'([^\']*)\''
)

MAX_RESULT_TEXT  = 12000
MAX_MESSAGES     = 40
MAX_STEPS        = 80
MAX_TOOL_RETRIES = 2
MAX_DUPLICATE_CALLS = 1   # block after 2 identical calls (was 3)
COMPLETION_MARKER = "task_status=completed"
DEFAULT_MAX_OUTPUT_TOKENS = 16384


# ── Helpers ───────────────────────────────────────────────────────────────────

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
    return cleaned.strip()


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

        if is_self_closing and tag_name in ("create_file", "lines_editor"):
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

async def run_agent(client, model: str, messages: List[Dict], mode: str = "agent", max_output_tokens: int = DEFAULT_MAX_OUTPUT_TOKENS):
    """
    Autonomous agentic execution loop with explicit planning phases.
    Streams events to the caller (FastAPI SSE layer).
    """
    mode = (mode or "agent").strip().lower()
    yield {"type": "task_status", "status": "pending"}
    yield _phase_event("analyzing", "Analyzing task…")

    seen_calls: Dict[str, int] = {}
    read_files: set = set()          # files already read this session
    edited_files: set = set()        # files already edited this session

    for step in range(MAX_STEPS):
        messages = _trim_messages(messages)

        # Emit planning phase before each model call (after step 0)
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
                # Model doesn't support this max_tokens value; retry without it
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
            messages.append({
                "role":    "user",
                "content": (
                    "Stream interrupted. Resume using only XML-like tool tags. "
                    "Do NOT use native function-calling. Continue the task."
                ),
            })
            yield {"type": "content", "content": f"\n[stream recovered: {e}]\n"}
            continue
        except Exception as e:
            yield {"type": "final", "content": f"[Agent stream error] {e}"}
            return

        # Handle output token limit cutoff — model stopped mid-generation
        if finish_reason == "length":
            messages.append({
                "role":    "assistant",
                "content": full_content or "[truncated]",
            })
            messages.append({
                "role":    "user",
                "content": (
                    "Your previous response was cut off because it hit the output token limit. "
                    "Please continue exactly from where you left off without repeating content. "
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

        # Store assistant turn as TEXT ONLY (strip tool tags so history stays clean)
        assistant_text = _strip_tool_tags(full_content).strip()
        messages.append({
            "role":    "assistant",
            "content": assistant_text or "[tool call]",
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

            # Signals that strongly indicate active/in-progress coding work —
            # only when these are absent do we consider the response "done".
            ACTIVE_WORK_SIGNALS = (
                "root cause", "target files", "phase 1", "phase 2",
                "will search", "will read", "will edit", "will run",
                "let me search", "let me read", "let me check", "let me look",
                "searching for", "reading file", "investigating",
                "starting with", "next i will", "now i will",
            )
            has_active_work_signal = any(s in lower for s in ACTIVE_WORK_SIGNALS)

            # Conversational / self-contained phrases that indicate the response
            # is complete and needs no further tool use.
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

            # A response that has a `?` or a known done-signal, and doesn't
            # show any active-work signal, is treated as complete.
            is_self_contained = (
                ("?" in full_content or has_done_signal)
                and not has_active_work_signal
            )

            # A very short response with no active-work signals is almost
            # certainly a greeting, clarification, or simple acknowledgement.
            is_short_non_task = (
                len(stripped.split()) <= 80
                and not has_active_work_signal
                and step == 0  # only on the first turn (before any tools ran)
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

        # ── Execute ONLY the first tool block (one tool per turn) ──────────
        yield _phase_event("executing", "Executing tool…")

        block = blocks[0]
        block["id"] = announced_blocks.get(block["start"], str(uuid.uuid4()))

        # Build a key that ignores line-range attributes so reading the same
        # file at different offsets still counts as a duplicate.
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
                "result": {"error": f"Duplicate call blocked — <{block['tag_name']}> with the same target was already called {seen_calls[call_key] - 1} time(s). Move to the next step."},
            }
            messages.append({
                "role":    "user",
                "content": (
                    f"Blocked: you already called <{block['tag_name']}> with the same arguments. "
                    "Do NOT repeat it. Move to the next step or end with:\n"
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

        # Track which files have been read / edited this session
        file_path_used = block["attributes"].get("path", "")
        if block["tag_name"] == "read_content_file" and file_path_used:
            read_files.add(file_path_used)
        elif block["tag_name"] in ("lines_editor", "create_file") and file_path_used:
            edited_files.add(file_path_used)

        yield {"type": "tool_result", "tool_call_id": block["id"], "result": result}

        compact = _compact_result(result)
        status_note = "" if success else " [FAILED — fix and retry with corrected arguments]"

        # Build a context hint so the model doesn't re-read files it has seen
        context_lines = []
        if read_files:
            context_lines.append(f"Already read (do NOT read again): {', '.join(sorted(read_files))}")
        if edited_files:
            context_lines.append(f"Already edited: {', '.join(sorted(edited_files))}")
        context_hint = ("\n" + "\n".join(context_lines)) if context_lines else ""

        messages.append({
            "role":    "user",
            "content": (
                f"<tool_result tag=\"{block['tag_name']}\" path=\"{file_path_used}\"{status_note}>\n"
                f"{json.dumps(compact)}\n"
                f"</tool_result>{context_hint}\n\n"
                "State your NEXT action in one sentence, then use exactly ONE tool tag. "
                "Do NOT re-read or re-search anything already listed above. "
                f"When all work is done, end with:\n  {COMPLETION_MARKER}"
            ),
        })

    yield {"type": "final", "content": f"Agent reached the {MAX_STEPS}-step limit without completing."}
