from tools.read_file import read_file
from tools.write_file import write_file
from tools.list_files import list_files
from tools.lines_editor import lines_editor
from tools.search_files import search_files
from tools.run_command import run_command
from tools.patch_file import patch_file
from tools.rename_file import rename_file

tool_definitions = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file in the current workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Workspace-relative path to the file."
                    }
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write complete content to a workspace file. Use only for creating new files or full rewrites.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "patch_file",
            "description": (
                "Surgically patch an existing file by replacing a unique search string with new content. "
                "Preferred tool for all targeted edits to existing files. "
                "The search string must appear exactly once in the file."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Workspace-relative path to the file."
                    },
                    "search": {
                        "type": "string",
                        "description": "Exact unique text to find and replace. Must appear exactly once."
                    },
                    "replace": {
                        "type": "string",
                        "description": "Replacement text. Must be the complete final replacement — no placeholders."
                    }
                },
                "required": ["path", "search", "replace"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "rename_file",
            "description": (
                "Move or rename a file within the workspace. "
                "Creates missing parent directories at the destination automatically. "
                "Fails safely if the destination already exists."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Workspace-relative path of the file to move/rename."
                    },
                    "new_path": {
                        "type": "string",
                        "description": "Workspace-relative destination path (new name or new location)."
                    }
                },
                "required": ["path", "new_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lines_editor",
            "description": (
                "Edit specific lines in an existing file using replace, insert, or delete operations. "
                "Use when patching multiple non-adjacent sections of the same file. "
                "Always read the line range first with read_file before calling this."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Workspace-relative path to the file."
                    },
                    "operations_json": {
                        "type": "string",
                        "description": (
                            "JSON array of operations. Each object has: "
                            "'op' ('replace'|'insert'|'delete'), "
                            "'start_line', 'end_line' (for replace/delete), "
                            "'after_line' (for insert), "
                            "'content' (for replace/insert, must end with \\n). "
                            "Example: [{\"op\":\"replace\",\"start_line\":5,\"end_line\":7,\"content\":\"new code\\n\"}]"
                        )
                    }
                },
                "required": ["path", "operations_json"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "List all files currently available in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "Search workspace files for matching text (plain text or regex) and return matching lines with file paths and line numbers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query (plain text or regex pattern)"},
                    "max_results": {"type": "integer", "description": "Maximum results to return (default 100)"},
                    "use_regex": {"type": "boolean", "description": "If true, query is treated as regex pattern (default false)"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Run a terminal command in the workspace directory and return stdout/stderr.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string"},
                    "timeout": {"type": "integer", "description": "Timeout in seconds (default 30)"}
                },
                "required": ["command"]
            }
        }
    },
]

tool_map = {
    "read_file":    {"execute": read_file},
    "write_file":   {"execute": write_file},
    "patch_file":   {"execute": patch_file},
    "rename_file":  {"execute": rename_file},
    "lines_editor": {"execute": lines_editor},
    "list_files":   {"execute": list_files},
    "search_files": {"execute": search_files},
    "run_command":  {"execute": run_command},
}
