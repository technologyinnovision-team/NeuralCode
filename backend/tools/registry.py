from tools.read_file import read_file
from tools.write_file import write_file
from tools.list_files import list_files
from tools.lines_editor import lines_editor
from tools.search_files import search_files
from tools.run_command import run_command

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
            "name": "lines_editor",
            "description": (
                "Precisely edit specific lines in an existing file. "
                "Supports replace, insert, and delete operations by line number. "
                "Always prefer this over write_file for targeted edits."
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
                            "JSON array of operations. Each operation object must have an 'op' field "
                            "('replace', 'insert', or 'delete') plus line numbers and content. "
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
            "description": "Search workspace files for matching text (plain text or regex) and return matching lines with metadata.",
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
                    "timeout": {"type": "integer"}
                },
                "required": ["command"]
            }
        }
    },
]

tool_map = {
    "read_file":    {"execute": read_file},
    "write_file":   {"execute": write_file},
    "lines_editor": {"execute": lines_editor},
    "list_files":   {"execute": list_files},
    "search_files": {"execute": search_files},
    "run_command":  {"execute": run_command},
}
