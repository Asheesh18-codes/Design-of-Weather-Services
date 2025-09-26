# Aviation Weather System - Windows PowerShell Startup Script
# Starts all three services and verifies integration

param(
    [switch]$StopServices = $false,
    [switch]$TestOnly = $false
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    White = "White"
}

function Write-ColorOutput($ForegroundColor, $Message) {
    Write-Host $Message -ForegroundColor $ForegroundColor
}

function Test-Port($Port, $ServiceName) {
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($connection) {
            Write-ColorOutput $Colors.Green "✅ $ServiceName (Port $Port): Running"
            return $true
        } else {
            Write-ColorOutput $Colors.Red "❌ $ServiceName (Port $Port): Not accessible"
            return $false
        }
    } catch {
        Write-ColorOutput $Colors.Red "❌ $ServiceName (Port $Port): Error checking - $($_.Exception.Message)"
        return $false
    }
}

function Stop-AllServices {
    Write-ColorOutput $Colors.Yellow "🛑 Stopping all aviation weather services..."
    
    # Stop processes on specific ports
    @(5000, 8000, 5173) | ForEach-Object {
        $port = $_
        try {
            $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
                        Select-Object -ExpandProperty OwningProcess | 
                        Get-Process -Id { $_ } -ErrorAction SilentlyContinue
            
            if ($processes) {
                $processes | ForEach-Object {
                    Write-ColorOutput $Colors.Yellow "Stopping process $($_.ProcessName) (PID: $($_.Id)) on port $port"
                    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                }
            }
        } catch {
            Write-ColorOutput $Colors.Yellow "No processes found on port $port"
        }
    }
    
    Start-Sleep -Seconds 2
    Write-ColorOutput $Colors.Green "✅ Services stopped"
}

function Start-Services {
    $projectRoot = "C:\Users\Hp\Desktop\Web dev\Major Project\Design-of-Weather-Services"
    
    Write-ColorOutput $Colors.Blue "🚀 Aviation Weather System Startup"
    Write-ColorOutput $Colors.Blue "=" * 50
    
    # Validate project structure
    $requiredPaths = @(
        "$projectRoot\backend-python-nlp\app.py",
        "$projectRoot\backend-node\server.js",
        "$projectRoot\frontend-react\package.json"
    )
    
    foreach ($path in $requiredPaths) {
        if (-not (Test-Path $path)) {
            Write-ColorOutput $Colors.Red "❌ Missing required file: $path"
            return $false
        }
    }
    
    Write-ColorOutput $Colors.Green "✅ Project structure validated"
    
    # Start Python NLP Backend (Port 8000)
    Write-ColorOutput $Colors.Cyan "🐍 Starting Python NLP Backend..."
    $pythonExe = "$projectRoot\.venv\Scripts\python.exe"
    $pythonBackendPath = "$projectRoot\backend-python-nlp"
    
    if (Test-Path $pythonExe) {
        Start-Process -FilePath "powershell.exe" -ArgumentList @(
            "-NoExit", "-Command", 
            "cd '$pythonBackendPath'; & '$pythonExe' -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"
        ) -WindowStyle Normal
        
        # Wait for Python service to start
        $attempts = 0
        do {
            Start-Sleep -Seconds 2
            $attempts++
            $pythonRunning = Test-Port 8000 "Python NLP Backend"
        } while (-not $pythonRunning -and $attempts -lt 10)
        
        if (-not $pythonRunning) {
            Write-ColorOutput $Colors.Red "❌ Failed to start Python NLP Backend"
            return $false
        }
    } else {
        Write-ColorOutput $Colors.Red "❌ Python environment not found at $pythonExe"
        return $false
    }
    
    # Start Node.js Backend (Port 5000)
    Write-ColorOutput $Colors.Cyan "⚡ Starting Node.js Backend..."
    $nodeBackendPath = "$projectRoot\backend-node"
    
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit", "-Command",
        "cd '$nodeBackendPath'; npm start"
    ) -WindowStyle Normal
    
    # Wait for Node service to start
    $attempts = 0
    do {
        Start-Sleep -Seconds 3
        $attempts++
        $nodeRunning = Test-Port 5000 "Node.js Backend"
    } while (-not $nodeRunning -and $attempts -lt 10)
    
    if (-not $nodeRunning) {
        Write-ColorOutput $Colors.Red "❌ Failed to start Node.js Backend"
        return $false
    }
    
    # Start React Frontend (Port 5173)
    Write-ColorOutput $Colors.Cyan "⚛️  Starting React Frontend..."
    $frontendPath = "$projectRoot\frontend-react"
    
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit", "-Command",
        "cd '$frontendPath'; npm run dev"
    ) -WindowStyle Normal
    
    # Wait for React service to start
    $attempts = 0
    do {
        Start-Sleep -Seconds 3
        $attempts++
        $frontendRunning = Test-Port 5173 "React Frontend"
    } while (-not $frontendRunning -and $attempts -lt 10)
    
    if (-not $frontendRunning) {
        Write-ColorOutput $Colors.Red "❌ Failed to start React Frontend"
        return $false
    }
    
    return $true
}

function Test-Integration {
    Write-ColorOutput $Colors.Cyan "🧪 Testing Service Integration..."
    
    # Test service health
    $services = @(
        @{Name="Python NLP"; Port=8000; Url="http://localhost:8000/docs"},
        @{Name="Node.js Backend"; Port=5000; Url="http://localhost:5000"},
        @{Name="React Frontend"; Port=5173; Url="http://localhost:5173"}
    )
    
    $allHealthy = $true
    foreach ($service in $services) {
        $isRunning = Test-Port $service.Port $service.Name
        if (-not $isRunning) {
            $allHealthy = $false
        }
    }
    
    if ($allHealthy) {
        Write-ColorOutput $Colors.Green "✅ All services are running successfully!"
        Write-ColorOutput $Colors.Blue ""
        Write-ColorOutput $Colors.White "🌐 Access your application:"
        Write-ColorOutput $Colors.White "   Frontend: http://localhost:5173"
        Write-ColorOutput $Colors.White "   Node.js API: http://localhost:5000"
        Write-ColorOutput $Colors.White "   Python NLP API: http://localhost:8000/docs"
        Write-ColorOutput $Colors.Blue ""
    } else {
        Write-ColorOutput $Colors.Red "❌ Some services are not running properly"
        return $false
    }
    
    return $true
}

# Main execution
try {
    if ($StopServices) {
        Stop-AllServices
        return
    }
    
    if ($TestOnly) {
        Test-Integration
        return
    }
    
    # Stop any existing services first
    Stop-AllServices
    
    # Start all services
    $success = Start-Services
    
    if ($success) {
        Start-Sleep -Seconds 2
        Test-Integration
        
        Write-ColorOutput $Colors.Green ""
        Write-ColorOutput $Colors.Green "🎉 Aviation Weather System is fully operational!"
        Write-ColorOutput $Colors.Yellow "Press Ctrl+C in any service window to stop that service."
    } else {
        Write-ColorOutput $Colors.Red "❌ Failed to start all services"
    }
    
} catch {
    Write-ColorOutput $Colors.Red "💥 Error: $($_.Exception.Message)"
}