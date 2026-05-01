from workspace import write_file as _write_file

async def write_file(path: str, content: str):
    _write_file(path, content)
    preview = content[:500] + ("..." if len(content) > 500 else "")
    return {"status": "saved", "path": path, "preview": preview}
