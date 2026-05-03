# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec — onedir mode (no temp-extraction, more reliable)

import sys
import os
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

block_cipher = None

# ── Python DLL (Windows) ───────────────────────────────────────────────────────
# Python 3.12+ requires the versioned DLL (python3XX.dll) to be explicitly
# included in the bundle. Without it the bootloader fails immediately with:
#   "Failed to load Python DLL ... python3XX.dll. LoadLibrary: The specified
#    module could not be found."
#
# We search every plausible Windows location because the DLL can be:
#   - Next to python.exe in a normal install  (C:\Python314\python314.dll)
#   - In sys.base_prefix for venv users       (C:\Python314\python314.dll)
#   - In the Windows system dirs for some installers
#   - Anywhere on PATH (Microsoft Store, conda, etc.)
# --
def _find_python_dll():
    major = sys.version_info.major
    minor = sys.version_info.minor
    dll_name = f'python{major}{minor}.dll'

    search_dirs = []

    # 1. Same directory as the running python.exe
    if sys.executable:
        search_dirs.append(os.path.dirname(os.path.abspath(sys.executable)))

    # 2. Base prefix — resolves correctly even inside a venv
    if hasattr(sys, 'base_prefix') and sys.base_prefix:
        search_dirs.append(sys.base_prefix)

    # 3. Real prefix (set by virtualenv, not venv)
    if hasattr(sys, 'real_prefix') and sys.real_prefix:
        search_dirs.append(sys.real_prefix)

    # 4. Windows system directories
    windir = os.environ.get('WINDIR', r'C:\Windows')
    search_dirs.append(os.path.join(windir, 'System32'))
    search_dirs.append(os.path.join(windir, 'SysWOW64'))

    # 5. Every directory on PATH
    for p in os.environ.get('PATH', '').split(os.pathsep):
        if p:
            search_dirs.append(p)

    seen = set()
    for d in search_dirs:
        if not d or d in seen:
            continue
        seen.add(d)
        candidate = os.path.join(d, dll_name)
        if os.path.isfile(candidate):
            print(f'[spec] Bundling {dll_name} from: {candidate}')
            return candidate

    print(f'[spec] WARNING: {dll_name} not found — bundle may fail at runtime.')
    print(f'[spec] Searched: {list(seen)}')
    return None


_python_dll_path = _find_python_dll()
_python_dll_binaries = [(_python_dll_path, '.')] if _python_dll_path else []

# ── pywinpty ──────────────────────────────────────────────────────────────────
winpty_binaries = []
winpty_datas = []
winpty_hiddenimports = []
try:
    winpty_datas_c, winpty_binaries_c, winpty_hiddenimports_c = collect_all('winpty')
    winpty_datas += winpty_datas_c
    winpty_binaries += winpty_binaries_c
    winpty_hiddenimports += winpty_hiddenimports_c
except Exception:
    pass

a = Analysis(
    ['server.py'],
    pathex=['.'],
    binaries=_python_dll_binaries + winpty_binaries,
    datas=[
        # rules/ contains Markdown instruction files — must be explicit data assets
        ('rules', 'rules'),
    ] + winpty_datas,
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.main',
        'uvicorn.config',
        'uvicorn.server',
        'uvicorn.supervisors',
        'fastapi',
        'fastapi.middleware',
        'fastapi.middleware.cors',
        'fastapi.responses',
        'starlette',
        'starlette.responses',
        'starlette.middleware',
        'starlette.websockets',
        'openai',
        'multipart',
        'multipart.multipart',
        'winpty',
        'h11',
        'httptools',
        'websockets',
        'wsproto',
        'anyio',
        'anyio.streams',
        'anyio.abc',
        'click',
        'watchfiles',
        'httpx',
        'python_multipart',
        'agent',
        'agent.agent',
        'tools',
        'tools.lines_editor',
        'tools.read_file',
        'tools.write_file',
        'tools.list_files',
        'tools.search_files',
        'tools.run_command',
        'tools.registry',
        'tools.edit_file',
        'tools.patch_file',
        'tools.rename_file',
        'context_manager',
        'workspace',
        'config',
    ] + winpty_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# onedir mode — exe lives at dist/server/server.exe
#               DLLs and modules live at dist/server/_internal/
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='server',
)
