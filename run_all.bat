@echo off
chcp 65001 > nul
echo =======================================================================
echo  🌟 Next-Agent Standalone Local AI Engine (100%% Zero-Cost System)
echo =======================================================================
echo.
echo [1/3] Launching Backend Server in background...
start "Next-Agent Backend" cmd /c "run_server.bat"

echo [2/3] Launching Frontend Dashboard in background...
start "Next-Agent Frontend" cmd /c "run_client.bat"

echo [3/3] Opening Web Dashboard in default browser...
timeout /t 3 /nobreak > nul
start http://localhost:5173

echo.
echo ✅ Next-Agent System is now running!
echo    - Frontend Dashboard: http://localhost:5173
echo    - Backend API Docs:   http://localhost:8000/docs
echo    - Ollama Local AI:    http://localhost:11434
echo =======================================================================
