"""
lines_editor — precise line-based file editing tool.

Supports three operations in a single call:
  - replace: overwrite lines start_line..end_line (inclusive, 1-indexed) with new content
  - insert:  insert content after after_line (use 0 to insert at top of file)
  - delete:  delete lines start_line..end_line (inclusive, 1-indexed)

Operations are applied in the order given, with line numbers re-evaluated after each step.
The payload must be a JSON array of operation objects.

Example payload:
[
  {"op": "replace", "start_line": 12, "end_line": 14, "content": "x = 1\ny = 2\n"},
  {"op": "insert", "after_line": 20, "content": "# new section\n"},
  {"op": "delete", "start_line": 30, "end_line": 32}
]
"""

import json
from workspace import read_file as _read_file, write_file as _write_file


def _apply_operation(lines: list[str], op: dict) -> tuple[list[str], dict]:
    kind = op.get("op", "").strip().lower()
    total = len(lines)

    if kind == "replace":
        s = int(op.get("start_line", 0))
        e = int(op.get("end_line", s))
        content = op.get("content", "")
        if s < 1 or s > total + 1:
            return lines, {"op": "replace", "error": f"start_line {s} out of range (1-{total})"}
        if e < s or e > total:
            return lines, {"op": "replace", "error": f"end_line {e} out of range ({s}-{total})"}
        new_lines = content.splitlines(keepends=True)
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines[-1] += "\n"
        result = lines[: s - 1] + new_lines + lines[e:]
        return result, {"op": "replace", "lines_removed": e - s + 1, "lines_added": len(new_lines), "at": s}

    if kind == "insert":
        after = int(op.get("after_line", 0))
        content = op.get("content", "")
        if after < 0 or after > total:
            return lines, {"op": "insert", "error": f"after_line {after} out of range (0-{total})"}
        new_lines = content.splitlines(keepends=True)
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines[-1] += "\n"
        result = lines[: after] + new_lines + lines[after:]
        return result, {"op": "insert", "lines_added": len(new_lines), "after": after}

    if kind == "delete":
        s = int(op.get("start_line", 0))
        e = int(op.get("end_line", s))
        if s < 1 or s > total:
            return lines, {"op": "delete", "error": f"start_line {s} out of range (1-{total})"}
        if e < s or e > total:
            return lines, {"op": "delete", "error": f"end_line {e} out of range ({s}-{total})"}
        result = lines[: s - 1] + lines[e:]
        return result, {"op": "delete", "lines_removed": e - s + 1, "at": s}

    return lines, {"op": kind, "error": f"Unknown operation '{kind}'. Valid ops: replace, insert, delete."}


async def lines_editor(path: str, operations_json: str):
    """
    Apply a list of line-based edit operations to a file.
    operations_json must be a JSON array of operation objects.
    """
    if not path:
        return {"success": False, "error": "Missing required attribute: path"}

    # Parse operations
    try:
        ops = json.loads(operations_json)
        if not isinstance(ops, list):
            ops = [ops]
    except json.JSONDecodeError as exc:
        return {
            "success": False,
            "error": f"Invalid JSON in operations payload: {exc}",
            "path": path,
        }

    if not ops:
        return {"success": False, "error": "No operations provided.", "path": path}

    # Read current file
    try:
        content = _read_file(path)
    except Exception as exc:
        return {"success": False, "error": f"Cannot read file: {exc}", "path": path}

    lines = content.splitlines(keepends=True)
    if lines and not lines[-1].endswith("\n"):
        lines[-1] += "\n"

    applied = []
    errors = []

    for i, op in enumerate(ops):
        if not isinstance(op, dict):
            errors.append({"index": i, "error": "Operation must be an object."})
            continue
        lines, info = _apply_operation(lines, op)
        info["index"] = i
        if "error" in info:
            errors.append(info)
        else:
            applied.append(info)

    if errors and not applied:
        return {
            "success": False,
            "errors": errors,
            "path": path,
        }

    new_content = "".join(lines)
    try:
        _write_file(path, new_content)
    except Exception as exc:
        return {"success": False, "error": f"Cannot write file: {exc}", "path": path}

    return {
        "success": True,
        "path": path,
        "total_lines": len(lines),
        "operations_applied": applied,
        "operations_failed": errors if errors else None,
    }
