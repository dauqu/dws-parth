@echo off
REM Uninstall Remote Admin Agent Service Manually
REM Run as Administrator

echo ========================================
echo Remote Admin Agent - Service Uninstaller
echo ========================================
echo.

net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: This script must be run as Administrator!
    pause
    exit /b 1
)

echo Stopping service...
sc stop RemoteAdminAgent
timeout /t 3 /nobreak >nul

echo Removing service...
sc delete RemoteAdminAgent

echo Removing files...
set INSTALL_DIR=C:\Program Files\Remote Admin Agent
if exist "%INSTALL_DIR%" (
    rmdir /S /Q "%INSTALL_DIR%"
)

echo.
echo Service uninstalled successfully!
pause
