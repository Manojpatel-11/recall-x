@echo off
REM RECALL-X Backend Startup Script for Windows

echo Starting RECALL-X Backend...

REM Check if .env exists
if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Please edit .env with your configuration before running again.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist .venv (
    if not exist venv (
        echo Creating virtual environment...
        python -m venv .venv
        call .venv\Scripts\activate.bat
        pip install -r requirements.txt
    ) else (
        call venv\Scripts\activate.bat
    )
) else (
    call .venv\Scripts\activate.bat
)

echo Starting FastAPI server on port 8001...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001