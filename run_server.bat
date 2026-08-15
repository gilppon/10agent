@echo off
chcp 65001 > nul
echo ========================================================
echo  🚀 Next-Agent Backend Engine Launching (FastAPI)
echo ========================================================

cd /d "%~dp0"

echo [1/2] Checking Python environment...
python -m pip install -r server\requirements.txt --quiet

echo [2/2] Starting FastAPI Server on http://localhost:8000 ...
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
pause
