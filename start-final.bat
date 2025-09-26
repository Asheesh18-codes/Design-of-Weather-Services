@echo off
setlocal enabledelayedexpansion

:: Aviation Weather Briefing System - Final Startup Script
:: Handles tokenizers dependency issues with automatic fallback

title Aviation Weather Briefing System

echo.
echo %ESC%[96m ___       _       _   _               %ESC%[0m
echo %ESC%[96m^|   \ ___ _^| ^|_ ___^| ^| ^|_^| ^|__ ___  ___ %ESC%[0m  
echo %ESC%[96m^| ^|) / _ \ ^|   ^/ -_^) ^| ^| ' \/ -_^)^| -_^|%ESC%[0m
echo %ESC%[96m^|___/\___/_^|_^|_\___^|_^|_^|_^|^|_\___^) \___^|%ESC%[0m
echo %ESC%[96m                   Aviation Weather Briefing System%ESC%[0m
echo.

:: Cleanup any existing Python processes
echo Cleaning up existing processes...
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 >nul

echo Setting up environment...

:: Create environment files
if not exist "backend-node\.env" (
    echo Creating backend-node environment...
    (
        echo PORT=5000
        echo NODE_ENV=development
        echo FRONTEND_URL=http://localhost:3000
        echo PYTHON_NLP_URL=http://localhost:8000
        echo LOG_LEVEL=info
    ) > backend-node\.env
)

if not exist "backend-python-nlp\.env" (
    echo Creating Python NLP environment...
    (
        echo PORT=8000
        echo ENV=development
        echo FRONTEND_URL=http://localhost:3000
        echo BACKEND_URL=http://localhost:5000
    ) > backend-python-nlp\.env
)

if not exist "frontend-react\.env" (
    echo Creating React frontend environment...
    (
        echo VITE_NODE_API_BASE=http://localhost:5000/api
        echo VITE_PYTHON_NLP_BASE=http://localhost:8000
        echo VITE_API_BASE=http://localhost:5000/api
        echo VITE_MAPBOX_KEY=pk.eyJ1IjoiZGV2YW5zaGpoYWEiLCJhIjoiY21lcGhzMHJkMW9rejJscHQ0ajdkY3hldiJ9.pw9MWbZoSOPzOJbqr4kMhg
        echo VITE_MAP_STYLE=mapbox://styles/mapbox/streets-v11
        echo VITE_DEFAULT_MAP_CENTER_LAT=39.8283
        echo VITE_DEFAULT_MAP_CENTER_LNG=-98.5795
        echo VITE_DEFAULT_MAP_ZOOM=4
        echo VITE_APP_TITLE=Aviation Weather Briefing
        echo VITE_APP_VERSION=1.0.0
    ) > frontend-react\.env
)

echo Installing dependencies...

:: Install Node.js dependencies
cd backend-node
if not exist "node_modules" (
    echo Installing Node.js backend dependencies...
    call npm install --quiet
)
cd ..

cd frontend-react
if not exist "node_modules" (
    echo Installing React frontend dependencies...
    call npm install --quiet
)
cd ..

:: Install Python minimal dependencies
cd backend-python-nlp
echo Installing Python minimal dependencies...
pip install --quiet --user fastapi uvicorn python-dotenv requests pydantic typing-extensions anyio

echo.
echo ====================================
echo Starting Aviation Weather System...
echo ====================================
echo.
echo Services starting:
echo - Node.js Backend (Port 5000)
echo - Python NLP Service (Port 8000) - Minimal Version
echo - React Frontend (Port 5173)
echo.

:: Start Node.js backend
echo Starting Node.js backend...
start "Aviation Backend" cmd /k "cd /d "%CD%\..\backend-node" && node server.js"

:: Wait a moment
timeout /t 3 >nul

:: Start Python NLP service (minimal version)
echo Starting Python NLP service...
start "Aviation NLP" cmd /k "cd /d "%CD%" && python app_minimal.py"

:: Wait a moment
timeout /t 3 >nul

:: Start React frontend
cd ..\frontend-react
echo Starting React frontend...
start "Aviation Frontend" cmd /k "cd /d "%CD%" && npm run dev"

cd ..

echo.
echo ====================================
echo System Starting Successfully!
echo ====================================
echo.
echo Frontend URL: http://localhost:5173
echo Node.js API:  http://localhost:5000
echo Python NLP:   http://localhost:8000
echo.
echo Wait 30-60 seconds for all services to initialize.
echo Then open http://localhost:5173 in your browser.
echo.
echo Features available:
echo - Flight Planning
echo - Weather Data Integration  
echo - NOTAM Processing (Rule-based)
echo - Text Summarization
echo.
echo To stop: Close all terminal windows
echo.

:: Automatically open browser after 10 seconds
echo Opening browser in 10 seconds...
timeout /t 10 >nul
start http://localhost:5173

echo System is running! Check your browser.
pause