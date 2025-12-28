@echo off
REM Uninstall Remote Admin Agent Windows Service

echo Stopping Remote Admin Agent Service...
sc stop RemoteAdminAgent
timeout /t 3 /nobreak >nul

echo Removing service...
sc delete RemoteAdminAgent

if %ERRORLEVEL% EQU 0 (
    echo Service removed successfully!
) else (
    echo Failed to remove service or service does not exist.
)

exit /b 0
