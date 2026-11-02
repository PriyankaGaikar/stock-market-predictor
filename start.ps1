# PowerShell launcher for Stock Market Predictor
$root = Resolve-Path "$PSScriptRoot\.."
if (Test-Path "$PSScriptRoot\backend") { $root = Resolve-Path "$PSScriptRoot" }
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$root = if (Test-Path "$scriptDir\backend") { (Resolve-Path "$scriptDir").Path } else { (Resolve-Path "$scriptDir\..").Path }

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Stock Market Predictor (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Clean ports 8000 & 5173 if busy
Get-NetTCPConnection -LocalPort 8000, 5173 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1

Write-Host "Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "cd '$root\backend'; & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --reload --port 8000"

Start-Sleep -Seconds 2

Write-Host "Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "Application launched in two new windows!" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend:  http://127.0.0.1:8000/docs" -ForegroundColor Yellow
