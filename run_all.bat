@echo off
cd /d "%~dp0"

echo =======================================================================
echo   Next-Agent Standalone Local AI Engine
echo =======================================================================
echo.
echo [1/3] Launching Backend Server on port 8000...
start "Next-Agent Backend" cmd /k "cd /d "%~dp0" && call "%~dp0run_server.bat""

echo [2/3] Launching Frontend Dashboard on port 5173...
start "Next-Agent Frontend" cmd /k "cd /d "%~dp0" && call "%~dp0run_client.bat""

echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

echo Opening Web Dashboard...
start http://localhost:5173

echo.
echo =======================================================================
echo   Next-Agent System is now running!
echo   - Frontend Dashboard: http://localhost:5173
echo   - Backend API Docs:   http://localhost:8000/docs
echo   - Ollama Local AI:    http://localhost:11434
echo =======================================================================
echo.
echo Press any key to close this launcher...
pause > nul
