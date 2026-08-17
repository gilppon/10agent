@echo off
cd /d "%~dp0client"
echo ========================================================
echo   Next-Agent Web Dashboard Launching (Vite + React)
echo ========================================================

echo [1/2] Starting Vite Dev Server on http://localhost:5173 ...
call npm run dev
pause
