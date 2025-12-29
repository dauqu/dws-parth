@echo off
REM Uninstall Remote Admin Agent Windows Service

REM Stop the service
sc stop RemoteAdminAgent >nul 2>&1
timeout /t 3 /nobreak >nul

REM Kill any running agent processes
taskkill /F /IM dws-agent.exe >nul 2>&1

REM Remove the service
sc delete RemoteAdminAgent >nul 2>&1

exit /b 0
