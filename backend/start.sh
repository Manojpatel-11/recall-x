#!/bin/bash
# RECALL-X Backend Startup Script

set -e

echo "Starting RECALL-X Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your configuration before running again."
    exit 1
fi

# Install dependencies if needed
if [ ! -d ".venv" ] && [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    else
        source venv/bin/activate
    fi
fi

# Run the server
echo "Starting FastAPI server on port 8001..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001