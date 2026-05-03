import asyncio
import json
import os
import sys
import threading

# When running as a PyInstaller bundle, data files (rules/) live in sys._MEIPASS.
# os.path.dirname(__file__) is unreliable in frozen mode, so we resolve once here.
_BASE_DIR: str = (
    sys._MEIPASS  # type: ignore[attr-defined]
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS")
    else os.path.dirname(os.path.abspath(__file__))
)

from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from fastapi.responses import JSONResponse

from workspace import (
    set_workspace,
    get_workspace,
    list_files,
    read_file,
    write_file,
    search_files,
    run_command
)
from config import set_config
from openai import AsyncOpenAI
from agent.agent import run_agent

try:
    import winpty
except ImportError:
    winpty = None

BASE_TOOL_SYSTEM_PROMPT = """
You are NeuralCode — an autonomous senior software engineer AI operating inside the \
user's workspace. Full behavioural rules are loaded from the rules/ files below.

# CORE MANDATE
You are an agent. Keep working until the task is COMPLETELY resolved before ending \
your turn. Never pause mid-task to ask "Should I continue?" or wait for confirmation. \
If something is ambiguous, resolve it by reading the code — not by asking the user.

# EXPLORATION STRATEGY (always before any edit)
1. If you don't know the workspace structure, call <Call_Tool_List_Files> once.
2. Use <search_in_files> with a high-level query to locate relevant symbols/files.
   Run a BROAD search first ("component that handles auth"), then narrow ("AuthService.login").
3. Read ONLY the lines you need: use from_lines/to_lines — never read entire large files.
4. After reading, emit a one-line plan: "Root cause: … | Files: … | Steps: 1. … 2. …"
5. Then execute edits sequentially, one tool per response.
6. After ALL edits: run a verification command (build, lint, or type-check).
7. If verification fails, fix the errors immediately — do not stop.

# EDIT STRATEGY
- **DEFAULT for ALL code edits: use `<lines_editor>`**. It accepts any content safely
  (HTML, JSX, `>`, `<`, TypeScript generics, newlines — everything).
- Only use `<patch_file>` for trivial single-line plain-text swaps with ZERO special
  characters (no `>`, `<`, `"`, newlines, HTML, or JSX). When in doubt: lines_editor.
- Always read the exact line numbers BEFORE editing. Never patch from memory.
- For new files, use `<create_file>` with the complete final content.

# TOOL SYNTAX REFERENCE

## List workspace files (use once if structure unknown)
<Call_Tool_List_Files></Call_Tool_List_Files>

## Read file content — always specify line range for large files
<read_content_file path="relative/path.ext" from_lines="1" to_lines="80"></read_content_file>

## Search across all files — start broad, then narrow
<search_in_files query="what you are looking for" max_results="30"></search_in_files>

## Edit specific lines — DEFAULT for ALL code edits (safe for any content)
<lines_editor path="relative/path.ext">
[
  {"op": "replace", "start_line": 12, "end_line": 14, "content": "new line 1\nnew line 2\n"},
  {"op": "insert", "after_line": 20, "content": "inserted line\n"},
  {"op": "delete", "start_line": 30, "end_line": 32}
]
</lines_editor>

## Patch an existing file — ONLY for trivial single-line plain-text swaps
## WARNING: NEVER use if content has >, <, ", newlines, HTML, JSX, or generics
<patch_file path="relative/path.ext" search="exact unique text" replace="new text"></patch_file>

## Create a brand-new file (never for existing files)
<create_file path="relative/new_file.ext">
COMPLETE FILE CONTENT HERE — NO PLACEHOLDERS, NO ELLIPSIS
</create_file>

## Run a shell command — always verify after edits
<run_command command="npm run build" timeout="120"></run_command>

# COMPLETION MARKER
When ALL work is truly done and verified, end your final response (no tool tags) with:
task_status=completed
"""


def _read_rule_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return ""


def build_system_prompt(mode: str = "agent", task_context: str = "") -> str:
    """
    Build the final system prompt for the given mode.
    Optionally accepts a task_context string (e.g. the user's first message)
    used to inject smart file-context from the index.
    """
    rules_dir = os.path.join(_BASE_DIR, "rules")
    mode = (mode or "agent").strip().lower()
    parts = [BASE_TOOL_SYSTEM_PROMPT.strip()]

    # Inject smart file context when we have a task and a workspace
    try:
        from context_manager import build_context_block, get_file_tree_summary
        if task_context:
            ctx_block = build_context_block(task_context, top_k=12)
            if ctx_block:
                parts.append(f"\n\n{ctx_block}")
        tree = get_file_tree_summary(max_files=60)
        if tree and tree != "(workspace is empty or not set)":
            parts.append(f"\n\n## Workspace file tree\n  {tree}")
    except Exception:
        pass

    if True:
        parts.append(
            "\n\nMODE: AGENT\n"
            "- Keep working autonomously until the task is COMPLETELY resolved. Never stop for 'Continue'.\n"
            "- Search FIRST (broad → narrow), read ONLY the lines needed, then edit with <lines_editor>.\n"
            "- <lines_editor> is the DEFAULT edit tool — handles HTML, JSX, generics, multi-line, everything.\n"
            "- <patch_file> is ONLY for trivial plain-text one-liners with zero > < \" or newlines.\n"
            "- If a tool tag was malformed last turn, switch to <lines_editor> immediately — do NOT retry patch_file.\n"
            "- After all edits, run a build or lint command to verify. Fix failures without stopping.\n"
            "- If genuinely stuck (missing credentials, external resource), ask ONE concise question.\n"
            "- End final response (no tool tags) with: task_status=completed\n"
        )

    if os.path.isdir(rules_dir):
        for name in (
            "SYSTEM_INSTRUCTIONS.md",
            "AGENT_RULES.md",
            "TOOL_RULES.md",
            "PROJECT_RULES.md",
            "LANGUAGE_GUIDES.md",
        ):
            content = _read_rule_file(os.path.join(rules_dir, name))
            if content:
                parts.append(f"\n\n# {name}\n{content}")

    return "\n".join(parts).strip()


app = FastAPI()


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"error": str(exc)})

# -----------------------------
# CORS
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# TERMINAL
# -----------------------------


class PowerShellTerminal:

    def __init__(self):

        if winpty is None:
            raise RuntimeError("pywinpty is required")

        self.loop = asyncio.get_running_loop()

        self.process = winpty.PtyProcess.spawn(
            ["powershell.exe", "-NoLogo"],
            env=os.environ.copy(),
            cwd=os.getcwd()
        )

        self.output_queue = asyncio.Queue()

        self.thread = threading.Thread(
            target=self._read_output,
            daemon=True
        )

        self.thread.start()

    def _read_output(self):

        try:

            while self.process.isalive():

                data = self.process.read(1024)

                if data:

                    text = (
                        data.decode("utf-8", errors="replace")
                        if isinstance(data, (bytes, bytearray))
                        else str(data)
                    )

                    asyncio.run_coroutine_threadsafe(
                        self.output_queue.put(text),
                        self.loop
                    )

        except Exception as exc:

            asyncio.run_coroutine_threadsafe(
                self.output_queue.put(f"\n[terminal error] {exc}\n"),
                self.loop
            )

    async def read_output(self):
        return await self.output_queue.get()

    def write_input(self, data: str):

        if self.process.isalive():
            self.process.write(data)

    def resize(self, cols: int, rows: int):

        if self.process.isalive():
            try:
                self.process.setwinsize(rows, cols)
            except Exception:
                pass

    def close(self):

        if self.process.isalive():
            try:
                self.process.terminate()
            except Exception:
                pass


@app.websocket("/terminal")
async def terminal(websocket: WebSocket):

    await websocket.accept()

    if winpty is None:

        await websocket.send_text("[server error] pywinpty not installed")
        await websocket.close()
        return

    terminal_process = PowerShellTerminal()

    async def send_output():

        while True:

            try:
                message = await terminal_process.read_output()
                await websocket.send_text(message)
            except:
                break

    output_task = asyncio.create_task(send_output())

    try:

        while True:

            payload = await websocket.receive_text()

            try:
                data = json.loads(payload)
            except:
                data = {"type": "input", "data": payload}

            action = data.get("type")

            if action == "resize":

                terminal_process.resize(
                    int(data.get("cols", 80)),
                    int(data.get("rows", 24))
                )

            else:

                terminal_process.write_input(
                    data.get("data", "")
                )

    finally:

        output_task.cancel()
        terminal_process.close()

        try:
            await websocket.close()
        except:
            pass


# -----------------------------
# CONFIG
# -----------------------------


@app.post("/config")
async def save_config(data: dict):

    base_url = data.get("baseUrl")
    api_key = data.get("apiKey")
    model = data.get("model")

    set_config(base_url, api_key, model)

    return {"status": "ok"}


# -----------------------------
# STREAMING CHAT
# -----------------------------


@app.websocket("/chat/stream")
async def chat_stream(websocket: WebSocket):

    await websocket.accept()

    try:

        payload = await websocket.receive_json()

        message = payload["message"]
        model = payload["model"]
        base_url = payload["baseUrl"]
        api_key = payload["apiKey"]

        client = AsyncOpenAI(
            base_url=base_url,
            api_key=api_key
        )

        stream = await client.chat.completions.create(
            model=model,
            stream=True,
            messages=[{"role": "user", "content": message}]
        )

        async for chunk in stream:

            delta = chunk.choices[0].delta

            if delta.content:
                await websocket.send_text(delta.content)

        await websocket.send_text("[DONE]")

    except Exception as e:

        await websocket.send_text(f"\n[server error] {str(e)}")

    finally:
        await websocket.close()


# -----------------------------
# WORKSPACE
# -----------------------------


def choose_folder():

    from tkinter import Tk, filedialog

    result = {"path": None}

    def pick():

        root = Tk()
        root.withdraw()
        root.attributes("-topmost", True)

        folder = filedialog.askdirectory()

        root.destroy()

        result["path"] = folder

    t = threading.Thread(target=pick)
    t.start()
    t.join()

    return result["path"]


@app.post("/workspace/open")
async def open_workspace():

    loop = asyncio.get_event_loop()

    path = await loop.run_in_executor(
        None,
        choose_folder
    )

    if not path:
        return {"workspace": None}

    workspace = set_workspace(path)

    # Rebuild the smart file index in the background
    try:
        from context_manager import rebuild_index
        await loop.run_in_executor(None, rebuild_index)
    except Exception:
        pass

    return {"workspace": workspace}


@app.post("/workspace/set")
async def set_workspace_path(data: dict):
    """Set the workspace to a given path directly (used by Electron native dialog)."""
    path = data.get("path")
    if not path:
        return {"workspace": None}

    workspace = set_workspace(path)

    loop = asyncio.get_event_loop()
    try:
        from context_manager import rebuild_index
        await loop.run_in_executor(None, rebuild_index)
    except Exception:
        pass

    return {"workspace": workspace}


@app.get("/workspace/files")
async def workspace_files():

    files = list_files()

    return {"files": files}


@app.post("/workspace/read")
async def workspace_read(data: dict):

    path = data.get("path")

    content = read_file(path)

    return {"content": content}


@app.post("/workspace/write")
async def workspace_write(data: dict):

    path = data.get("path")
    content = data.get("content")

    write_file(path, content)

    return {"status": "saved"}
@app.post("/workspace/edit")
async def workspace_edit(data: dict):

    path = data.get("path")
    search = data.get("search")
    replace = data.get("replace")

    content = read_file(path)
    if search not in content:
        return {"error": "Search text not found", "success": False}

    updated = content.replace(search, replace)
    write_file(path, updated)

    return {"success": True, "path": path}


@app.post("/workspace/lines-edit")
async def workspace_lines_edit(data: dict):
    from tools.lines_editor import lines_editor
    path = data.get("path")
    operations_json = data.get("operations_json")
    if not path or not operations_json:
        return {"success": False, "error": "Missing path or operations_json"}
    result = await lines_editor(path=path, operations_json=operations_json)
    return result


@app.post("/workspace/file-stats")
async def workspace_file_stats(data: dict):
    """Return character count and token estimate for a list of file paths.
    Used by the frontend to show pinned file sizes before a task runs."""
    paths = data.get("paths", [])
    stats = []
    for path in paths:
        try:
            content = read_file(path)
            if isinstance(content, dict):
                content = content.get("content", "")
            chars = len(content) if isinstance(content, str) else 0
            stats.append({
                "path":   path,
                "chars":  chars,
                "tokens": max(1, chars // 4),
            })
        except Exception:
            stats.append({"path": path, "chars": 0, "tokens": 0})
    return {"stats": stats}


@app.post("/workspace/search")
async def workspace_search(data: dict):

    query = data.get("query")
    max_results = int(data.get("max_results", 100))
    use_regex = data.get("use_regex", False)

    result = search_files(query, max_results, use_regex)
    return result


@app.post("/workspace/command")
async def workspace_command(data: dict):

    command = data.get("command")
    timeout = int(data.get("timeout", 30))

    result = run_command(command, timeout)
    return result


# Health check endpoint for Electron app
@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/workspace/path")
async def workspace_path():

    return {"workspace": get_workspace()}


@app.post("/chat/agent")
async def chat_agent(data: dict):

    message = data.get("message")
    messages_in = data.get("messages")
    model = data.get("model")
    mode = data.get("mode", "agent")
    base_url = data.get("baseUrl")
    api_key = data.get("apiKey")
    pinned_files: list = data.get("pinnedFiles") or []

    if not model:
        return {"error": "Missing model"}
    if not message and not messages_in:
        return {"error": "Missing message(s)"}

    client = AsyncOpenAI(
        base_url=base_url,
        api_key=api_key
    )

    # Extract the first user message for context-aware system prompt
    first_user_msg = message or ""
    if isinstance(messages_in, list):
        for m in messages_in:
            if isinstance(m, dict) and m.get("role") == "user":
                first_user_msg = m.get("content", "")
                break

    system_prompt = build_system_prompt(mode, task_context=first_user_msg)

    # ── Collect smart files (for context_init event) ──────────────────────────
    smart_file_infos: list = []
    try:
        from context_manager import get_relevant_files
        relevant = get_relevant_files(first_user_msg, top_k=12)
        smart_file_infos = [
            {"path": m["path"], "chars": m["size"], "tokens": max(1, m["size"] // 4)}
            for m in relevant
        ]
    except Exception:
        pass

    # ── Inject pinned file contents into system prompt ────────────────────────
    pinned_infos: list = []
    if pinned_files and isinstance(pinned_files, list):
        pinned_parts: list[str] = []
        for path in pinned_files:
            try:
                content = read_file(path)
                if isinstance(content, dict):
                    content = content.get("content", "")
                if content and isinstance(content, str) and content.strip():
                    chars = len(content)
                    preview = content[:8000]
                    ellipsis = "\n... (truncated)" if chars > 8000 else ""
                    pinned_parts.append(
                        f"\n### {path} ({chars} chars)\n```\n{preview}{ellipsis}\n```"
                    )
                    pinned_infos.append({
                        "path": path,
                        "chars": chars,
                        "tokens": max(1, chars // 4),
                    })
            except Exception:
                pass
        if pinned_parts:
            system_prompt += (
                "\n\n## Pinned Files (user-selected — always keep these in mind)\n"
                + "\n".join(pinned_parts)
            )

    messages = [{"role": "system", "content": system_prompt}]
    if isinstance(messages_in, list) and len(messages_in) > 0:
        for m in messages_in:
            if not isinstance(m, dict):
                continue
            role = m.get("role")
            content = m.get("content", "")
            if role in ("user", "assistant") and isinstance(content, str) and content.strip():
                messages.append({"role": role, "content": content})
    else:
        messages.append({"role": "user", "content": message})

    max_output_tokens = int(data.get("maxOutputTokens") or 16384)

    async def generate():
        # Emit context_init so the frontend panel knows what was pre-loaded
        yield f"data: {json.dumps({'type': 'context_init', 'smart_files': smart_file_infos, 'pinned_files': pinned_infos})}\n\n"
        async for event in run_agent(client, model, messages, mode=mode, max_output_tokens=max_output_tokens):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/workspace/index")
async def rebuild_workspace_index():
    """Rebuild the smart file index for the current workspace."""
    try:
        from context_manager import rebuild_index
        count = rebuild_index()
        return {"status": "ok", "files_indexed": count}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.get("/workspace/index/search")
async def search_workspace_index(query: str = "", top_k: int = 10):
    """Return the most relevant files for a query string."""
    try:
        from context_manager import get_relevant_files
        results = get_relevant_files(query, top_k=top_k)
        return {"results": results}
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn

    # Electron launches this file directly, so we must boot the ASGI server here.
    port = int(os.environ.get("BACKEND_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
