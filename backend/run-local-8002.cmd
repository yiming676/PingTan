@echo off
cd /d "%~dp0"
set PUBLIC_BASE_URL=http://localhost:8002
set CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8002
