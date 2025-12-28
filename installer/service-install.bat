@echo off
REM Install Remote Admin Agent as Windows Service

echo Installing Remote Admin Agent Service...

REM Check if service already exists
sc query RemoteAdminAgent >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Service already exists. Stopping and removing...
    sc stop RemoteAdminAgent
    timeout /t 2 /nobreak >nul
    sc delete RemoteAdminAgent
    timeout /t 2 /nobreak >nul
)

REM Install service using sc.exe
sc create RemoteAdminAgent binPath= "\"%~dp0agent.exe\"" DisplayName= "Remote Admin Agent" start= auto
if %ERRORLEVEL% NEQ 0 (
    echo Failed to create service!
    exit /b 1
)

REM Set service description
sc description RemoteAdminAgent "Remote administration agent for monitoring and controlling Windows devices"

REM Configure service to restart on failure
sc failure RemoteAdminAgent reset= 86400 actions= restart/60000/restart/60000/restart/60000

REM Set service to run as Local System
sc config RemoteAdminAgent obj= LocalSystem

echo Service installed successfully!
echo Starting service...

REM Start the service
sc start RemoteAdminAgent
if %ERRORLEVEL% NEQ 0 (
    echo Failed to start service!
    exit /b 1
)

echo Remote Admin Agent service is now running!
exit /b 0
