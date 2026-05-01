import subprocess
from workspace import get_workspace

async def run_command(command: str, timeout: int = 30):
    workspace = get_workspace()
    if not workspace:
        raise ValueError("Workspace not set")

    result = subprocess.run(
        command,
        cwd=workspace,
        shell=True,
        capture_output=True,
        text=True,
        timeout=timeout
    )

    return {
        "command": command,
        "return_code": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr
    }
