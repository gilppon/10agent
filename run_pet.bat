@echo off
cd /d "%~dp0"

echo =======================================================================
echo   DamaAI Desktop-Resident AI Growth Pet Launcher
echo =======================================================================
echo.

echo [1/3] Launching FastAPI Brain Server on port 8000...
start "DamaAI Backend Server" cmd /k "cd /d "%~dp0" && call "%~dp0run_server.bat""

echo [2/3] Launching Desktop Pet Widget on port 5174...
start "DamaAI Desktop Pet Widget" cmd /k "cd /d "%~dp0desktop-pet" && npm run dev"

echo [3/3] Waiting for services to initialize...
timeout /t 4 /nobreak > nul

echo Opening DamaAI Desktop Pet Widget...
start http://localhost:5174

echo.
echo =======================================================================
echo   DamaAI Growth Pet is now LIVE!
echo   - Pet Widget URL:  http://localhost:5174
echo   - Backend API:     http://localhost:8000/api/pet/status
echo   - Native Tauri:    cd desktop-pet ^&^& npm run tauri dev
echo =======================================================================
echo.
echo Press any key to close this launcher...
pause > nul
