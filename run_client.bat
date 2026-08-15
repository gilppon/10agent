@echo off
chcp 65001 > nul
echo ========================================================
echo  ✨ Next-Agent Web Dashboard Launching (Vite + React)
echo ========================================================

cd /d "%~dp0client"

echo [1/2] Checking npm dependencies...
call npm install --silent

echo [2/2] Starting Vite Dev Server on http://localhost:5173 ...
call npm run dev
pause
