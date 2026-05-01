from workspace import list_files as _list_files

async def list_files(path: str = None):
    files = _list_files()
    return {"files": files}
