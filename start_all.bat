@echo off
cd /d "%~dp0"

echo ==========================================
echo  Remote Device Management System
echo  Full Stack Startup
echo ==========================================
echo.

echo [1/2] Starting Backend Server...
start "Backend Server" cmd /k "cd bin && server.exe"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend...
cd frontend
start "Frontend Dev Server" cmd /k "pnpm dev"

echo.
echo ==========================================
echo  Both servers are starting...
echo  Backend: http://localhost:8080
echo  Frontend: http://localhost:3000
echo ==========================================
echo.
pause
