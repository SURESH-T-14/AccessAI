# ============================================================
# AccessAI - Hand Gesture Recognition Starter (PowerShell)
# Starts both Flask backend and React frontend automatically
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   AccessAI Hand Gesture Recognition System" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will start:" -ForegroundColor Green
Write-Host "  1. Flask Gesture API Server (port 5000)" -ForegroundColor Green
Write-Host "  2. React Development App (port 5174)" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path ".\.venv")) {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run this script from: D:\ai bot base" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Kill any existing Python processes on port 5000
Write-Host "Checking for existing servers..." -ForegroundColor Yellow
$existingPort = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($existingPort) {
    Write-Host "WARNING: Port 5000 already in use" -ForegroundColor Yellow
    Write-Host "Attempting to free port..." -ForegroundColor Yellow
    Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Start Flask Server
Write-Host ""
Write-Host "[1/2] Starting Flask Gesture Server..." -ForegroundColor Cyan
Write-Host ""

$flaskCommand = {
    cd "C:\ai bot base"
    .\.venv\Scripts\python.exe gesture_api_server_simple.py
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", {
    cd "C:\ai bot base"
    Write-Host "🚀 Starting Flask Gesture API Server..." -ForegroundColor Green
    Write-Host ""
    .\.venv\Scripts\python.exe gesture_api_server_simple.py
} -WindowStyle Normal

# Wait for server to start
Write-Host "Waiting for Flask server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start React App
Write-Host ""
Write-Host "[2/2] Starting React Development App..." -ForegroundColor Cyan
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", {
    cd "C:\ai bot base"
    Write-Host "🚀 Starting React Development App..." -ForegroundColor Green
    Write-Host ""
    npm run dev
} -WindowStyle Normal

# Wait for everything to start
Start-Sleep -Seconds 3

# Show status message
Clear-Host
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   ✅ SERVERS STARTING!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Flask API Server:     " -NoNewline -ForegroundColor White
Write-Host "http://localhost:5000" -ForegroundColor Green
Write-Host "React App:            " -NoNewline -ForegroundColor White
Write-Host "http://localhost:5174" -ForegroundColor Green
Write-Host ""
Write-Host "Opening browser..." -ForegroundColor Yellow
Write-Host ""

# Open browser
Start-Process "http://localhost:5174"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   NEXT STEPS:" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Click the Hand icon (🖐️) in the top right toolbar" -ForegroundColor White
Write-Host "2. Click "▶️ Start Detection" button" -ForegroundColor White
Write-Host "3. Allow camera access when prompted" -ForegroundColor White
Write-Host "4. Make hand gestures (A-Z sign language)" -ForegroundColor White
Write-Host "5. Watch the AI recognize your gestures!" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you see errors:" -ForegroundColor Yellow
Write-Host "  - Check the Flask server window for error messages" -ForegroundColor Yellow
Write-Host "  - Make sure your camera is connected" -ForegroundColor Yellow
Write-Host "  - Allow camera permissions in browser (F12 console)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Both terminals will stay open so you can see logs." -ForegroundColor Yellow
Write-Host "Close either terminal to stop that service." -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to continue"
