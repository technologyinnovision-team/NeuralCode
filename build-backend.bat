@echo off
setlocal EnableDelayedExpansion

echo ================================================
echo  NeuralCode - Build Standalone Backend (Windows)
echo ================================================
echo.

cd /d "%~dp0backend"

:: ── Step 1: Clean ALL previous artifacts ────────────────────────────────────
echo [1/6] Cleaning previous build artifacts...
if exist "build" (
    rmdir /s /q "build"
    echo        Removed: backend\build\
)
if exist "dist" (
    rmdir /s /q "dist"
    echo        Removed: backend\dist\
)
echo        Done.
echo.

:: ── Step 2: Install PyInstaller ─────────────────────────────────────────────
echo [2/6] Installing / upgrading PyInstaller (>=6.0)...
pip install "pyinstaller>=6.0" --upgrade --quiet
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pip failed. Make sure Python and pip are on PATH.
    pause & exit /b 1
)

:: ── Step 3: Install core backend dependencies ───────────────────────────────
echo [3/6] Installing backend dependencies...
pip install -r requirements.txt --quiet
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install backend dependencies.
    pause & exit /b 1
)

:: ── Step 4: Try pywinpty (optional — no Rust required) ──────────────────────
echo [4/6] Trying pywinpty wheel (optional - terminal feature)...
pip install "pywinpty>=2.0.0" --only-binary :all: --quiet
if %ERRORLEVEL% NEQ 0 (
    echo        No wheel for this Python version - terminal feature disabled.
) else (
    echo        pywinpty installed OK.
)
echo.

:: ── Step 5: Build with PyInstaller ──────────────────────────────────────────
echo [5/6] Running PyInstaller...
echo.
pyinstaller server.spec --clean --distpath dist --workpath build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: PyInstaller build failed - see output above.
    pause & exit /b 1
)

:: Verify the real output exists
if not exist "dist\server\server.exe" (
    echo ERROR: dist\server\server.exe was not created.
    pause & exit /b 1
)

:: ── Step 6: Guarantee python3XX.dll is in the bundle ────────────────────────
echo [6/6] Verifying Python DLL in bundle...

:: Find which Python is on PATH
for /f "delims=" %%P in ('where python 2^>nul') do (
    set "PYEXE=%%P"
    goto :found_python
)
:found_python

if not defined PYEXE (
    echo        WARNING: python not found on PATH - cannot verify DLL.
    goto :skip_dll
)

:: Ask Python for its version digits and executable directory
for /f "delims=" %%D in ('python -c "import sys,os; print(os.path.dirname(sys.executable))"') do set "PYDIR=%%D"
for /f "delims=" %%V in ('python -c "import sys; print(str(sys.version_info.major)+str(sys.version_info.minor))"') do set "PYVER=%%V"
for /f "delims=" %%B in ('python -c "import sys; print(getattr(sys,\"base_prefix\",sys.prefix))"') do set "PYBASE=%%B"

set "DLLNAME=python!PYVER!.dll"
set "DLLDEST=dist\server\_internal\!DLLNAME!"

echo        Looking for !DLLNAME! ...

if exist "!DLLDEST!" (
    echo        Found in bundle already: _internal\!DLLNAME!  - nothing to do.
    goto :skip_dll
)

:: Search candidate directories for the DLL
set "DLLFOUND="
for %%L in (
    "!PYDIR!\!DLLNAME!"
    "!PYBASE!\!DLLNAME!"
    "%WINDIR%\System32\!DLLNAME!"
    "%WINDIR%\SysWOW64\!DLLNAME!"
) do (
    if not defined DLLFOUND (
        if exist %%L (
            set "DLLFOUND=%%~L"
        )
    )
)

if defined DLLFOUND (
    echo        Copying !DLLNAME! from: !DLLFOUND!
    copy /Y "!DLLFOUND!" "dist\server\_internal\!DLLNAME!" >nul
    echo        Done.
) else (
    echo        WARNING: !DLLNAME! not found anywhere.
    echo        The bundled exe may fail on machines without Python installed.
)

:skip_dll

:: ── Remove backend\build\server\ so it can NEVER be accidentally run ─────────
echo.
echo        Removing backend\build\server\ (work dir - NOT runnable)...
if exist "build\server" rmdir /s /q "build\server"
echo        Done - only dist\server\ contains the real executable.

echo.
echo ================================================
echo  BUILD COMPLETE
echo.
echo  >>> Run this file:   backend\dist\server\server.exe
echo  >>> NOT this folder: backend\build\  (deleted above)
echo.
echo  To test the standalone server:
echo    backend\dist\server\server.exe
echo.
echo  To build the full Electron app:
echo    cd frontend
echo    npm run build-electron        (frontend + packaging)
echo    npm run build-electron-full   (backend + frontend + packaging)
echo ================================================
echo.
pause
