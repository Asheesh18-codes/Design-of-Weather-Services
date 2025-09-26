@echo off
setlocal enabledelayedexpansion

:: Aviation Weather Briefing System - Smart Startup Script
:: Tries full ML version first, falls back to minimal version if dependencies fail

title Aviation Weather Briefing System - Startup

echo.
echo  ___       _       _   _               
echo ^|   \ ___ _^| ^|_ ___^| ^| ^|_^| ^|__ ___  ___  
echo ^| ^|) / _ \ ^|   ^/ -_^) ^| ^| ' \/ -_^)^| -_^)
echo ^|___/\___/_^|_^|_\___^|_^|_^|_^|^|_\___^) \___^|
echo                   Aviation Weather Briefing System
echo.

:: Color definitions (for better output)
for /F %%a in ('echo prompt $E ^| cmd') do set ESC=%%a

echo %ESC%[96mAviation Weather Briefing System%ESC%[0m
echo %ESC%[96m====================================%ESC%[0m
echo.

echo %ESC%[93mChecking prerequisites...%ESC%[0m

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ESC%[91m❌ Node.js is not installed%ESC%[0m
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo %ESC%[92m✅ Node.js installed%ESC%[0m

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ESC%[91m❌ Python is not installed%ESC%[0m
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)
echo %ESC%[92m✅ Python installed%ESC%[0m

:: Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ESC%[91m❌ npm is not installed%ESC%[0m
    echo npm should come with Node.js
    pause
    exit /b 1
)
echo %ESC%[92m✅ npm installed%ESC%[0m

echo.
echo %ESC%[93mSetting up environment files...%ESC%[0m

:: Create Node.js backend .env
if not exist "backend-node\.env" (
    echo %ESC%[94mCreating backend-node\.env%ESC%[0m
    (
        echo PORT=5000
        echo NODE_ENV=development
        echo FRONTEND_URL=http://localhost:3000
        echo PYTHON_NLP_URL=http://localhost:8000
        echo LOG_LEVEL=info
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
    ) > backend-node\.env
)

:: Create Python NLP service .env
if not exist "backend-python-nlp\.env" (
    echo %ESC%[94mCreating backend-python-nlp\.env%ESC%[0m
    (
        echo PORT=8000
        echo ENV=development
        echo FRONTEND_URL=http://localhost:3000
        echo BACKEND_URL=http://localhost:5000
        echo HF_TOKEN=your_huggingface_token_here
        echo HF_MODEL=sshleifer/distilbart-cnn-12-6
        echo MAX_SUMMARY_LENGTH=200
        echo MIN_SUMMARY_LENGTH=50
        echo LOG_LEVEL=info
        echo MAX_WORKERS=4
        echo TIMEOUT_SECONDS=30
    ) > backend-python-nlp\.env
)

:: Create React frontend .env
if not exist "frontend-react\.env" (
    echo %ESC%[94mCreating frontend-react\.env%ESC%[0m
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
        echo VITE_ENABLE_NLP_DIRECT=true
        echo VITE_ENABLE_OFFLINE_MODE=true
        echo VITE_ENABLE_DEBUG_LOGGING=true
        echo VITE_DEV_MODE=true
        echo VITE_MOCK_BACKEND=false
    ) > frontend-react\.env
)

echo %ESC%[92m✅ Environment files configured%ESC%[0m
echo.

echo %ESC%[93mInstalling dependencies...%ESC%[0m

:: Install Node.js backend dependencies
echo %ESC%[94mInstalling Node.js backend dependencies...%ESC%[0m
cd backend-node
if not exist "node_modules" (
    call npm install
    if !errorlevel! neq 0 (
        echo %ESC%[91m❌ Failed to install Node.js backend dependencies%ESC%[0m
        pause
        exit /b 1
    )
) else (
    echo %ESC%[92m✅ Node.js backend dependencies already installed%ESC%[0m
)
cd ..

:: Install React frontend dependencies
echo %ESC%[94mInstalling React frontend dependencies...%ESC%[0m
cd frontend-react  
if not exist "node_modules" (
    call npm install
    if !errorlevel! neq 0 (
        echo %ESC%[91m❌ Failed to install React frontend dependencies%ESC%[0m
        pause
        exit /b 1
    )
) else (
    echo %ESC%[92m✅ React frontend dependencies already installed%ESC%[0m
)
cd ..

:: Python setup with smart fallback
echo %ESC%[94mSetting up Python environment...%ESC%[0m
cd backend-python-nlp

:: Create virtual environment if needed
if not exist ".venv" (
    echo %ESC%[94mCreating Python virtual environment...%ESC%[0m
    python -m venv .venv
)

:: Activate virtual environment
call .venv\Scripts\activate.bat

:: Try to install essential packages first
echo %ESC%[94mInstalling essential Python packages...%ESC%[0m
pip install fastapi uvicorn python-dotenv requests pydantic >nul 2>&1
if !errorlevel! neq 0 (
    echo %ESC%[91m❌ Failed to install essential Python packages%ESC%[0m
    pause
    exit /b 1
)
echo %ESC%[92m✅ Essential Python packages installed%ESC%[0m

:: Try to install ML packages (optional)
echo %ESC%[94mTrying to install ML packages...%ESC%[0m
pip install transformers torch tokenizers >nul 2>&1
if !errorlevel! neq 0 (
    echo %ESC%[93m⚠️ ML packages installation failed - will use minimal version%ESC%[0m
    set USE_MINIMAL=1
) else (
    echo %ESC%[92m✅ ML packages installed successfully%ESC%[0m
    set USE_MINIMAL=0
)

cd ..

echo %ESC%[92m✅ All dependencies processed%ESC%[0m
echo.

echo %ESC%[96mStarting Aviation Weather Briefing System...%ESC%[0m
echo %ESC%[96m============================================%ESC%[0m
echo.

echo You will see 3 terminal windows:
echo %ESC%[92m1. Node.js Backend (Port 5000)%ESC%[0m
echo %ESC%[93m2. Python NLP Service (Port 8000)%ESC%[0m
if "%USE_MINIMAL%"=="1" (
    echo %ESC%[93m   └─ Using minimal/rule-based version%ESC%[0m
) else (
    echo %ESC%[93m   └─ Using full ML-powered version%ESC%[0m
)
echo %ESC%[94m3. React Frontend (Port 3000/5173)%ESC%[0m
echo.
echo %ESC%[93mWait for all services to start, then open:%ESC%[0m
echo %ESC%[96mhttp://localhost:3000%ESC%[0m or %ESC%[96mhttp://localhost:5173%ESC%[0m
echo.
echo Press any key to start all services...
pause > nul

echo %ESC%[92mStarting Node.js backend...%ESC%[0m
start "Aviation Backend (Node.js)" cmd /k "cd backend-node && node server.js"

echo %ESC%[93mStarting Python NLP service...%ESC%[0m
if "%USE_MINIMAL%"=="1" (
    start "Aviation NLP (Python - Minimal)" cmd /k "cd backend-python-nlp && .venv\Scripts\activate.bat && python app_minimal.py"
    echo %ESC%[93m└─ Using minimal version due to ML dependency issues%ESC%[0m
) else (
    start "Aviation NLP (Python - Full)" cmd /k "cd backend-python-nlp && .venv\Scripts\activate.bat && python app.py"
    echo %ESC%[93m└─ Using full ML-powered version%ESC%[0m
)

timeout /t 3 >nul

echo %ESC%[94mStarting React frontend...%ESC%[0m
start "Aviation Frontend (React)" cmd /k "cd frontend-react && npm run dev"

echo.
echo %ESC%[96m=====================================%ESC%[0m
echo %ESC%[96mAll services are starting...%ESC%[0m
echo %ESC%[96m=====================================%ESC%[0m
echo.
echo %ESC%[93mWait about 30-60 seconds for all services to initialize.%ESC%[0m
echo.
echo %ESC%[92mService URLs:%ESC%[0m
echo %ESC%[94m- Frontend:     http://localhost:3000 or http://localhost:5173%ESC%[0m
echo %ESC%[94m- Node.js API:  http://localhost:5000%ESC%[0m
if "%USE_MINIMAL%"=="1" (
    echo %ESC%[94m- Python NLP:   http://localhost:8000 ^(Minimal Version^)%ESC%[0m
) else (
    echo %ESC%[94m- Python NLP:   http://localhost:8000 ^(Full ML Version^)%ESC%[0m
)
echo.
echo %ESC%[92mAPI Endpoints:%ESC%[0m
echo %ESC%[94m- Flight Planning: http://localhost:5000/api/flightplan%ESC%[0m
echo %ESC%[94m- Weather Data:    http://localhost:5000/api/weather%ESC%[0m
echo %ESC%[94m- NOTAM Processing: http://localhost:5000/api/notam%ESC%[0m
echo %ESC%[94m- NLP Parsing:     http://localhost:8000/nlp/parse-notam%ESC%[0m
echo %ESC%[94m- NLP Summary:     http://localhost:8000/nlp/summarize%ESC%[0m
echo.
echo %ESC%[93mTest the system:%ESC%[0m
echo %ESC%[94m1. Open your browser to the frontend URL above%ESC%[0m
echo %ESC%[94m2. Fill out the flight form ^(Origin: KJFK, Destination: KSFO^)%ESC%[0m
echo %ESC%[94m3. Click 'Get Flight Briefing' to see the full integration%ESC%[0m
echo.
echo %ESC%[91mTo stop all services: Close all terminal windows%ESC%[0m
echo.
pause