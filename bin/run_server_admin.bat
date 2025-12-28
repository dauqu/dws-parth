@echo off
echo ========================================
echo  Remote Admin Server (Administrator)
echo ========================================
echo.
echo Starting server with Administrator privileges...
echo This is required for service management.
echo.

cd /d "%~dp0"

REM Check if already admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - Starting server...
    server.exe
) else (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~dp0server.exe' -Verb RunAs"
)

pause
