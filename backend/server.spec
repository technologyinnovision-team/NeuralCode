# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec — onedir mode (no temp-extraction, more reliable)

import sys
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

block_cipher = None

# Collect pywinpty binaries and data (includes winpty.dll and the .pyd extension)
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
    binaries=winpty_binaries,
    datas=[
        # rules/ contains Markdown files — must be explicit data assets
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

# onedir mode: exe + _internal/ folder — no temp extraction, no AV issues
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
