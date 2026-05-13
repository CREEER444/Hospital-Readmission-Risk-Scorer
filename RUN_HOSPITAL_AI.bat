@echo off
title Hospital Readmission AI System
color 0A

cd /d "%~dp0"

echo ==========================================
echo   HOSPITAL READMISSION AI SYSTEM
echo ==========================================
echo.

echo Starting Backend Server...
start "Backend Flask API" cmd /k "cd /d %~dp0 && python app.py"

echo Waiting for backend...
timeout /t 5 /nobreak >nul

echo Starting Frontend...
start "Frontend React App" cmd /k "cd /d %~dp0 && npm start"

echo.
echo Opening browser...
timeout /t 8 /nobreak >nul
start http://localhost:3000

echo.
echo ==========================================
echo Backend Running : http://localhost:5000
echo Frontend Running: http://localhost:3000
echo ==========================================
echo.
pause
