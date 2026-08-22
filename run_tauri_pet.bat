@echo off
cd /d "%~dp0"

echo =======================================================================
echo   DamaAI Native Desktop Transparent Pet Launcher (Tauri Native)
echo =======================================================================
echo.

set CARGO_TARGET_DIR=%LOCALAPPDATA%\Temp\damaai-target

echo [1/2] Checking FastAPI Brain Server...
start "DamaAI Backend Server" cmd /k "cd /d "%~dp0" && call "%~dp0run_server.bat""

echo [2/2] Launching Tauri Transparent Desktop Pet Native Window...
cd desktop-pet
npm run tauri dev
