@echo off
REM Manual Service Installation (without installer)
REM Run this as Administrator to test the service

echo ========================================
echo Remote Admin Agent - Service Installer
echo ========================================
echo.

REM Check if running as admin
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Check if agent.exe exists
if not exist "..\bin\agent.exe" (
    echo ERROR: agent.exe not found in ..\bin\
    echo Please build the agent first:
    echo   cd ..\agent
    echo   go build -o ..\bin\agent.exe .
    pause
    exit /b 1
)

REM Copy agent to Program Files
set INSTALL_DIR=C:\Program Files\Remote Admin Agent
echo Creating directory: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Copying agent.exe...
copy /Y "..\bin\agent.exe" "%INSTALL_DIR%\agent.exe"

REM Install service
echo.
echo Installing Windows Service...

REM Check if service exists
sc query RemoteAdminAgent >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Service already exists. Stopping...
    sc stop RemoteAdminAgent
    timeout /t 2 /nobreak >nul
    echo Removing old service...
    sc delete RemoteAdminAgent
    timeout /t 2 /nobreak >nul
)

REM Create service
sc create RemoteAdminAgent binPath= "\"%INSTALL_DIR%\agent.exe\"" DisplayName= "Remote Admin Agent" start= auto

REM Set description
sc description RemoteAdminAgent "Remote administration agent for monitoring and controlling Windows devices"

REM Configure auto-restart on failure
sc failure RemoteAdminAgent reset= 86400 actions= restart/60000/restart/60000/restart/60000

REM Start service
echo.
echo Starting service...
sc start RemoteAdminAgent

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo Remote Admin Agent is now running as a Windows service.
    echo It will start automatically when Windows boots.
    echo.
    echo To manage the service:
    echo   - View status: sc query RemoteAdminAgent
    echo   - Stop:        sc stop RemoteAdminAgent
    echo   - Start:       sc start RemoteAdminAgent
    echo   - Services:    services.msc
    echo.
) else (
    echo.
    echo ERROR: Failed to start service!
    echo Check the Event Viewer for error details.
)

pause
