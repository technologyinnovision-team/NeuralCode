@echo off
setlocal

echo ================================================
echo  NeuralCode - Build Standalone Backend (Windows)
echo ================================================
echo.

cd /d "%~dp0backend"

echo [1/3] Installing PyInstaller...
pip install pyinstaller --quiet
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install PyInstaller. Make sure pip is available.
    pause
    exit /b 1
)

echo [2/3] Installing backend dependencies...
pip install -r requirements.txt --quiet
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install backend dependencies.
    pause
    exit /b 1
)

echo [3/3] Building backend with PyInstaller (onedir mode)...
pyinstaller server.spec --clean
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PyInstaller build failed.
    pause
    exit /b 1
)

echo.
echo ================================================
echo  Build complete!
echo  Output: backend\dist\server\   (server.exe + _internal\)
echo.
echo  Next steps to build the full Electron app:
echo    cd frontend
echo    npm run build-electron
echo.
echo  Or do everything in one command:
echo    cd frontend
echo    npm run build-electron-full
echo ================================================
echo.
pause
