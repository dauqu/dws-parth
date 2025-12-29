@echo off
REM Install Remote Admin Agent as Windows Service - Non-blocking version

REM Check if service already exists and remove it
sc query RemoteAdminAgent >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    sc stop RemoteAdminAgent >nul 2>&1
    sc delete RemoteAdminAgent >nul 2>&1
)

REM Install service
sc create RemoteAdminAgent binPath= "\"%~dp0dws-agent.exe\"" DisplayName= "Remote Admin Agent" start= auto >nul 2>&1

REM Configure service
sc description RemoteAdminAgent "Remote administration agent" >nul 2>&1
sc failure RemoteAdminAgent reset= 86400 actions= restart/60000/restart/60000/restart/60000 >nul 2>&1

REM Start the service in background
start /B sc start RemoteAdminAgent >nul 2>&1

REM Exit immediately
exit /b 0

