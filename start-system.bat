@echo off
echo Starting Aviation Weather Briefing System...
echo.

echo Checking if Node.js is installed...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Checking if Python is installed...
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

echo.
echo Setting up environment variables...
if not exist "backend-node\.env" (
    echo Creating backend-node\.env file...
    copy "backend-node\.env.example" "backend-node\.env" 2>nul || (
        echo PORT=5000 > "backend-node\.env"
        echo NODE_ENV=development >> "backend-node\.env" 
        echo FRONTEND_URL=http://localhost:3000 >> "backend-node\.env"
        echo PYTHON_NLP_URL=http://localhost:8000 >> "backend-node\.env"
    )
)

if not exist "backend-python-nlp\.env" (
    echo Creating backend-python-nlp\.env file...
    copy "backend-python-nlp\.env.example" "backend-python-nlp\.env" 2>nul || (
        echo PORT=8000 > "backend-python-nlp\.env"
        echo ENV=development >> "backend-python-nlp\.env"
        echo FRONTEND_URL=http://localhost:3000 >> "backend-python-nlp\.env"
        echo BACKEND_URL=http://localhost:5000 >> "backend-python-nlp\.env"
    )
)

if not exist "frontend-react\.env" (
    echo Creating frontend-react\.env file...
    echo VITE_NODE_API_BASE=http://localhost:5000/api > "frontend-react\.env"
    echo VITE_PYTHON_NLP_BASE=http://localhost:8000 >> "frontend-react\.env"
    echo VITE_MAPBOX_KEY=pk.eyJ1IjoiZGV2YW5zaGpoYWEiLCJhIjoiY21lcGhzMHJkMW9rejJscHQ0ajdkY3hldiJ9.pw9MWbZoSOPzOJbqr4kMhg >> "frontend-react\.env"
)

echo.
echo Installing Node.js dependencies...
cd backend-node
if not exist "node_modules" (
    echo Installing backend-node dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install Node.js backend dependencies
        pause
        exit /b 1
    )
)
cd ..

cd frontend-react  
if not exist "node_modules" (
    echo Installing frontend-react dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install React frontend dependencies
        pause
        exit /b 1
    )
)
cd ..

echo.
echo Installing Python dependencies...
cd backend-python-nlp
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo Installing Python packages...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo ====================================
echo Aviation Weather Briefing System
echo ====================================
echo.
echo Starting all services...
echo.
echo You will see 3 terminal windows:
echo 1. Node.js Backend (Port 5000)
echo 2. Python NLP Service (Port 8000)  
echo 3. React Frontend (Port 3000)
echo.
echo Wait for all services to start, then open:
echo http://localhost:3000
echo.
echo Press any key to continue...
pause > nul

echo Starting Node.js backend...
start "Aviation Backend (Node.js)" cmd /k "cd backend-node && npm run dev"

echo Starting Python NLP service...
start "Aviation NLP (Python)" cmd /k "cd backend-python-nlp && .venv\Scripts\activate.bat && python app.py"

echo Starting React frontend...
start "Aviation Frontend (React)" cmd /k "cd frontend-react && npm run dev"

echo.
echo ====================================
echo All services are starting...
echo ====================================
echo.
echo Wait about 30 seconds for all services to initialize.
echo.
echo Then open your browser to: http://localhost:3000
echo.
echo To stop all services: Close all terminal windows
echo.
echo Service URLs:
echo - Frontend:     http://localhost:3000
echo - Node.js API:  http://localhost:5000  
echo - Python NLP:   http://localhost:8000
echo.
pause