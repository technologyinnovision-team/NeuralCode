import os
import shutil
from workspace import get_workspace


async def rename_file(path: str, new_path: str) -> dict:
    """
    Move or rename a file within the workspace.
    Both `path` and `new_path` are workspace-relative.
    Creates any missing parent directories for the destination.
    """
    workspace = get_workspace()
    if not workspace:
        return {"success": False, "error": "Workspace not set."}

    src_abs = os.path.normpath(os.path.join(workspace, path))
    dst_abs = os.path.normpath(os.path.join(workspace, new_path))

    # Security: both paths must remain inside the workspace
    if not src_abs.startswith(workspace):
        return {"success": False, "error": "Source path escapes the workspace."}
    if not dst_abs.startswith(workspace):
        return {"success": False, "error": "Destination path escapes the workspace."}

    if not os.path.exists(src_abs):
        return {"success": False, "error": f"Source file not found: {path}"}

    if os.path.exists(dst_abs):
        return {"success": False, "error": f"Destination already exists: {new_path}. Delete it first or choose a different name."}

    try:
        os.makedirs(os.path.dirname(dst_abs), exist_ok=True)
        shutil.move(src_abs, dst_abs)
    except Exception as e:
        return {"success": False, "error": f"Move failed: {e}"}

    return {
        "success": True,
        "operation": "rename",
        "from": path,
        "to": new_path,
    }
