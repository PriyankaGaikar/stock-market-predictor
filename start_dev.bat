@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   Starting Stock Market Predictor (Backend + Frontend)
echo ========================================================

rem Resolve root directory path
set "ROOT_DIR=%~dp0"
if exist "%ROOT_DIR%backend" (
    rem Root directory
) else (
    set "ROOT_DIR=%~dp0..\"
)

rem Free port 8000 if occupied
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

rem Free port 5173 if occupied
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

ping 127.0.0.1 -n 2 >nul

echo Starting FastAPI Backend on http://127.0.0.1:8000...
start "Backend - FastAPI" cmd /k "cd /d "%ROOT_DIR%backend" && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
start "Backend - FastAPI" cmd /k "cd /d "%ROOT_DIR%backend" && "%ROOT_DIR%backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000"

ping 127.0.0.1 -n 3 >nul

echo Starting Vite Frontend on http://localhost:5173...
start "Frontend - Vite React" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo ========================================================
echo   Application started successfully!
echo   Frontend App: http://localhost:5173
echo   Backend API:  http://127.0.0.1:8000
echo   API Docs:     http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
