# Aviation Weather Services - Full Stack Startup Script (Windows PowerShell)
# This script starts all three services: Node.js backend, Python NLP backend, and React frontend

Write-Host "Starting Aviation Weather Services Full Stack..." -ForegroundColor Green
Write-Host ""

# Function to start a process in a new window
function Start-ServiceInNewWindow {
    param($Title, $Command, $WorkingDirectory)
    Start-Process powershell -ArgumentList "-Command", "Set-Location '$WorkingDirectory'; $Command; Read-Host 'Press Enter to close'" -WindowStyle Normal
    Start-Sleep 2
}

# Start Node.js Backend (Port 5000)
Write-Host "Starting Node.js Backend on port 5000..." -ForegroundColor Yellow
$nodeDir = Join-Path $PSScriptRoot "backend-node"
Start-ServiceInNewWindow "Node.js Backend" "npm start" $nodeDir

# Start Python NLP Backend (Port 8000)
Write-Host "Starting Python NLP Backend on port 8000..." -ForegroundColor Yellow
$pythonDir = Join-Path $PSScriptRoot "backend-python-nlp"
$pythonExe = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
Start-ServiceInNewWindow "Python NLP Backend" "python app.py" $pythonDir

# Start React Frontend (Port 5173)
Write-Host "Starting React Frontend on port 5173..." -ForegroundColor Yellow
$frontendDir = Join-Path $PSScriptRoot "frontend-react"
Start-ServiceInNewWindow "React Frontend" "npm run dev" $frontendDir

Write-Host ""
Write-Host "All services started successfully!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Node.js API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Python NLP API: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Each service is running in its own window. Close the windows to stop the services." -ForegroundColor White

Read-Host "Press Enter to continue"