@echo off
REM NeuralCode Electron Development Script
REM Starts both the Vite dev server and Electron in development mode

setlocal enabledelayedexpansion

cd /d "%~dp0\frontend"

REM Check if node_modules exists, if not install
if not exist "node_modules" (
    echo.
    echo Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        exit /b 1
    )
)

REM Check if Electron main/preload are compiled
if not exist "dist-electron" (
    echo.
    echo Compiling Electron main process...
    call npm run build-electron-main
    if errorlevel 1 (
        echo Failed to compile Electron
        exit /b 1
    )
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║       NeuralCode - Starting Development Environment         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Starting Vite dev server and Electron...
echo.

REM Start the development environment
call npm run dev-electron

endlocal
pause
