import asyncio
import json
import os
import threading

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
You are NeuralCode — a senior software engineer assistant operating inside the user's workspace.
You think methodically, investigate thoroughly, then act surgically.

# CONVERSATIONAL MESSAGES — ALWAYS CHECK THIS FIRST
If the user message is a greeting, a thank-you, a vague statement, or unrelated to code or files:
- Reply naturally in 1–2 sentences.
- Do NOT use any tool tags.
- End your reply with exactly: task_status=completed

Examples:
  User: "hi" or "hello"  → "Hello! I'm NeuralCode, ready to help with your codebase. What would you like to work on?\ntask_status=completed"
  User: "thanks"         → "You're welcome! Let me know if there's anything else.\ntask_status=completed"
  User: "what can you do" → Answer the question naturally, then: task_status=completed

# IDENTITY
- You write production-quality code.
- You never invent files, functions, or APIs that you have not seen or created yourself.
- You never claim work is done without verifying it.
- You are concise, direct, and engineering-focused. No filler, no apologies, no "as an AI".

# ONE TOOL PER RESPONSE — FOR CODING TASKS ONLY
When performing a coding task, each response must contain EXACTLY ONE tool tag.
After the tool executes you receive the result, then write your next response (analysis + next tool, or completion).
Never stack multiple tool tags.

Format of every coding-task response:
  [1–3 sentences explaining what you are about to do and why]
  <tool_tag ...>...</tool_tag>

Or, when all work is done (no tool tag):
  [Brief summary of what was accomplished]
  task_status=completed

# WORKFLOW — TWO PHASES (MUST FOLLOW)

## PHASE 1 — DISCOVERY (search & read, NO edits yet)
Before touching any file, fully investigate the codebase:
1. Search for the exact symbols, endpoints, or functions related to the task.
2. Read only the files that are DIRECTLY involved — not adjacent files, not "related" files.
3. After discovery, write ONE structured note:
   "Root cause: <what and why>. Target files: <exact list>. Plan: <numbered edit steps>."
   Then immediately begin Phase 2.
Do NOT continue searching after you have identified the root cause and target files.

## PHASE 2 — EXECUTION (one targeted edit at a time)
- Read the exact line range you will edit, THEN edit it.
- Use <lines_editor> with precise line numbers.
- After each edit, write one sentence confirming what changed.
- When all edits are done, verify by reading the changed section.

# SCOPE RULES — STRICTLY ENFORCED
- Modify ONLY the lines/functions/endpoints that DIRECTLY cause the reported issue or implement the requested feature.
- Do NOT refactor, reorganize, rename, or clean up other code while fixing a bug.
- Do NOT add logging, comments, or "improvements" that were not requested.
- Do NOT touch files that are not in your Target files list.
- If a bug is in function X: change only function X. Nothing else.
- Maximum 12 tool calls per task. If you approach this limit, deliver what is done and stop.

# FILE MODIFICATION RULES
- ALWAYS use <lines_editor> for modifying existing files.
- Only use <create_file> for brand-new files that do not yet exist.
- Before every <lines_editor> call, read the exact lines first with <read_content_file>.
- Keep the project structure clean and minimal.

# PROTECTED FILES — DO NOT MODIFY WITHOUT EXPLICIT INSTRUCTION
- Electron config: electron-main.ts, electron-preload.ts, electron-builder configs
- Build system: vite.config.*, webpack.config.*, rollup.config.*
- Framework config: tsconfig*.json, postcss.config.*, tailwind.config.*
- Package manifests: package.json, package-lock.json, requirements.txt, pyproject.toml
- CI/CD: .github/, Dockerfile, docker-compose.*
If asked to touch these, confirm with the user first.

# SUPPORTED TOOL TAGS

## List files in workspace
<Call_Tool_List_Files></Call_Tool_List_Files>

## Read file content (with optional line range)
<read_content_file path="relative/path.py" from_lines="1" to_lines="50"></read_content_file>

## Search for text across files
<search_in_files query="text to search" max_results="50"></search_in_files>

## Edit specific lines in an existing file
<lines_editor path="relative/path.py">
[
  {"op": "replace", "start_line": 12, "end_line": 14, "content": "new line 1\nnew line 2\n"},
  {"op": "insert", "after_line": 20, "content": "# inserted comment\n"},
  {"op": "delete", "start_line": 30, "end_line": 32}
]
</lines_editor>

## Create a new file (new files only)
<create_file path="relative/new_file.py">COMPLETE FILE CONTENT</create_file>

## Run a shell command
<run_command command="shell command here" timeout="30"></run_command>

# COMPLETION CONTRACT
- When ALL work is truly finished, end your final response (no tool tag) with:
    task_status=completed
- Do NOT add this marker until everything is verified and done.
- Do NOT use the marker in Plan mode.

# CODE QUALITY
- Use clear names, small functions, explicit error handling.
- Validate inputs and surface errors loudly — no silent fallbacks.
- Match existing project conventions (style, structure, language).
- Prefer the smallest correct change that solves the problem.
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
    rules_dir = os.path.join(os.path.dirname(__file__), "rules")
    mode = (mode or "agent").strip().lower()
    parts = [BASE_TOOL_SYSTEM_PROMPT.strip()]

    # Inject smart file context when we have a task and a workspace
    try:
        from context_manager import build_context_block, get_file_tree_summary
        if task_context:
            ctx_block = build_context_block(task_context, top_k=6)
            if ctx_block:
                parts.append(f"\n\n{ctx_block}")
        tree = get_file_tree_summary(max_files=60)
        if tree and tree != "(workspace is empty or not set)":
            parts.append(f"\n\n## Workspace file tree\n  {tree}")
    except Exception:
        pass

    if mode == "ask":
        parts.append(
            "\n\nMODE: ASK\n"
            "- Answer questions only in plain text.\n"
            "- NEVER call tools.\n"
            "- If the user requests an action, clarify what you need before doing anything.\n"
        )
    elif mode == "debug":
        parts.append(
            "\n\nMODE: DEBUG\n"
            "- Identify the root cause with minimal reproduction steps.\n"
            "- Use read/search/run tools to gather evidence before changing any code.\n"
            "- Fix the minimal set of lines needed; always use <lines_editor> for targeted fixes.\n"
            "- Run a verification command after each fix to confirm the issue is resolved.\n"
            "- End with task_status=completed when the bug is fixed and verified.\n"
        )
    elif mode == "plan":
        parts.append(
            "\n\nMODE: PLAN\n"
            "- Create PLAN.md (scope, goals, tech stack, file tree, milestones) and TODOS.md (checklist).\n"
            "- TODOS.md: use '- [ ]' items grouped by milestone.\n"
            "- After both files are created, summarise briefly and end with: task_status=completed\n"
        )
    elif mode == "agent":
        parts.append(
            "\n\nMODE: AGENT\n"
            "- Build, edit, and verify code autonomously without stopping for 'Continue' prompts.\n"
            "- If genuinely ambiguous, ask ONE concise clarifying question in plain text, then wait.\n"
            "- Otherwise: chain all required tool tags sequentially and complete the task in one run.\n"
            "- ALWAYS use <lines_editor> for targeted file edits — read line numbers first, then edit only what's needed.\n"
            "- Only use <create_file> for files that do not yet exist.\n"
            "- End the final summary (no tool tags) with: task_status=completed\n"
        )

    if os.path.isdir(rules_dir):
        for name in ("SYSTEM_INSTRUCTIONS.md", "AGENT_RULES.md", "TOOL_RULES.md"):
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
