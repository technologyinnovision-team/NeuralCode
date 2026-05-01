from workspace import read_file as _read_file

async def read_file(path: str):
    return {"content": _read_file(path)}
