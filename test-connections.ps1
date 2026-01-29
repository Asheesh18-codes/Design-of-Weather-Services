# Connection Test Script
# Tests frontend connectivity to both backend services

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Aviation Weather Services - Connection Test" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Test 1: Node.js Backend (port 5000)
Write-Host "[1/3] Testing Node.js Backend (http://localhost:5000)..." -ForegroundColor Yellow
try {
    $nodeHealth = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 5
    Write-Host "✓ Node.js Backend: " -ForegroundColor Green -NoNewline
    Write-Host "CONNECTED" -ForegroundColor Green
    Write-Host "  Status: $($nodeHealth.status)" -ForegroundColor Gray
    Write-Host "  CheckWX API: $($nodeHealth.services.checkwx_backup_api)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Node.js Backend: " -ForegroundColor Red -NoNewline
    Write-Host "FAILED" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Python NLP Backend (port 8000)
Write-Host "[2/3] Testing Python NLP Backend (http://localhost:8000)..." -ForegroundColor Yellow
try {
    $pythonHealth = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    Write-Host "✓ Python NLP Backend: " -ForegroundColor Green -NoNewline
    Write-Host "CONNECTED" -ForegroundColor Green
    Write-Host "  Status: $($pythonHealth.status)" -ForegroundColor Gray
    Write-Host "  Model Provider: $($pythonHealth.environment.model_provider)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Python NLP Backend: " -ForegroundColor Red -NoNewline
    Write-Host "FAILED - May need restart" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Frontend (port 3000)
Write-Host "[3/3] Testing Frontend (http://localhost:3000)..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ Frontend: " -ForegroundColor Green -NoNewline
    Write-Host "RUNNING" -ForegroundColor Green
    Write-Host "  Status Code: $($frontend.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Frontend: " -ForegroundColor Red -NoNewline
    Write-Host "NOT ACCESSIBLE" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Connection Test Complete" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Environment File Check
Write-Host "Environment Files Status:" -ForegroundColor Yellow
$envFiles = @(
    "frontend\.env.local",
    "frontend\.env",
    "backend-node\.env",
    "backend-python-nlp\.env"
)

foreach ($envFile in $envFiles) {
    $fullPath = Join-Path (Get-Location) $envFile
    if (Test-Path $fullPath) {
        Write-Host "  ✓ $envFile exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $envFile MISSING" -ForegroundColor Red
    }
}

Write-Host "`nTo restart services, run: ./start-all-services.ps1`n" -ForegroundColor Cyan
