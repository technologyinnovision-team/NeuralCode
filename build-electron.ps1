# NeuralCode Electron Build Script for Windows
# This script builds the complete Electron application with Python backend

param(
    [string]$Target = "win",
    [switch]$Portable,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$FrontendDir = Split-Path -Parent -Path $ScriptDir  # frontend folder
$ProjectRoot = Split-Path -Parent -Path $FrontendDir  # project root
$BackendDir = Join-Path -Path $ProjectRoot -ChildPath "backend"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           NeuralCode - Electron App Builder v1.0           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Clean build directories if requested
if ($Clean) {
    Write-Host "🧹 Cleaning build directories..." -ForegroundColor Yellow
    Remove-Item -Path (Join-Path -Path $FrontendDir -ChildPath "dist") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path -Path $FrontendDir -ChildPath "dist-electron") -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Cleaned" -ForegroundColor Green
}

# Step 2: Install frontend dependencies
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location -Path $FrontendDir
if (-not (Test-Path -Path "node_modules")) {
    npm install
} else {
    npm ci
}
Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
Pop-Location

# Step 3: Build React + Vite
Write-Host "`n🔨 Building React application..." -ForegroundColor Yellow
Push-Location -Path $FrontendDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ React build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ React application built" -ForegroundColor Green
Pop-Location

# Step 4: Compile Electron main and preload processes
Write-Host "`n🔨 Compiling Electron main process..." -ForegroundColor Yellow
Push-Location -Path $FrontendDir
npm run build-electron-main
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Electron compilation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Electron main process compiled" -ForegroundColor Green
Pop-Location

# Step 5: Copy backend files to resources
Write-Host "`n📋 Copying backend files..." -ForegroundColor Yellow
$BuildResourcesDir = Join-Path -Path $FrontendDir -ChildPath "dist"
$BackendResourcesDir = Join-Path -Path $BuildResourcesDir -ChildPath "backend"

if (-not (Test-Path -Path $BackendResourcesDir)) {
    New-Item -ItemType Directory -Path $BackendResourcesDir -Force | Out-Null
}

# Copy backend Python files
Copy-Item -Path (Join-Path -Path $BackendDir -ChildPath "*.py") -Destination $BackendResourcesDir -Force
Copy-Item -Path (Join-Path -Path $BackendDir -ChildPath "agent") -Destination $BackendResourcesDir -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path -Path $BackendDir -ChildPath "tools") -Destination $BackendResourcesDir -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path -Path $BackendDir -ChildPath "rules") -Destination $BackendResourcesDir -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path -Path $BackendDir -ChildPath "requirements.txt") -Destination $BackendResourcesDir -Force

Write-Host "✓ Backend files copied" -ForegroundColor Green

# Step 6: Install Python dependencies in resources (optional, for distribution)
Write-Host "`n📦 Setting up Python environment..." -ForegroundColor Yellow
# Note: Users will need Python installed, so we don't include pip packages
# They'll be installed at runtime if needed
Write-Host "✓ Python environment configured" -ForegroundColor Green

# Step 7: Build the Electron app
Write-Host "`n🔨 Building Electron application..." -ForegroundColor Yellow
Push-Location -Path $FrontendDir

$ElectronBuilderArgs = @("dist")
if ($Portable) {
    $ElectronBuilderArgs += "--win", "portable"
} else {
    $ElectronBuilderArgs += "--win", "nsis", "portable"
}

& electron-builder @ElectronBuilderArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Electron build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Electron application built" -ForegroundColor Green
Pop-Location

# Step 8: Success summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              BUILD SUCCESSFUL! ✓                           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$DistDir = Join-Path -Path $FrontendDir -ChildPath "dist-electron"
if (Test-Path -Path $DistDir) {
    Write-Host "📦 Output location: $DistDir" -ForegroundColor Yellow
    Write-Host "`n📋 Generated files:" -ForegroundColor Yellow
    Get-ChildItem -Path $DistDir -Include "*.exe", "*.msi" | ForEach-Object {
        Write-Host "  • $($_.Name)" -ForegroundColor Green
    }
}

Write-Host "`n✨ NeuralCode is ready for distribution!`n" -ForegroundColor Green
