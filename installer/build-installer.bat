@echo off
REM Build Remote Admin Agent Installer

echo ========================================
echo Building Remote Admin Agent Installer
echo ========================================

REM Check if Inno Setup is installed
set INNO_PATH="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist %INNO_PATH% (
    echo ERROR: Inno Setup not found!
    echo Please install Inno Setup from: https://jrsoftware.org/isdl.php
    echo.
    echo Installation steps:
    echo 1. Download Inno Setup from https://jrsoftware.org/isdl.php
    echo 2. Install it to the default location
    echo 3. Run this script again
    pause
    exit /b 1
)

REM Check if agent.exe exists
if not exist "..\bin\agent.exe" (
    echo ERROR: agent.exe not found!
    echo Building agent...
    cd ..\agent
    go build -o ..\bin\agent.exe .
    cd ..\installer
    if not exist "..\bin\agent.exe" (
        echo Failed to build agent!
        pause
        exit /b 1
    )
)

REM Create assets directory if it doesn't exist
if not exist "..\assets" mkdir "..\assets"

REM Create a simple icon if it doesn't exist (you can replace this with a real icon)
if not exist "..\assets\icon.ico" (
    echo Creating placeholder icon...
    echo Note: Replace assets\icon.ico with your custom icon for better branding
)

REM Build the installer
echo.
echo Compiling installer...
%INNO_PATH% setup.iss

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo Installer created: ..\bin\RemoteAdminAgent-Setup.exe
    echo.
    echo You can now distribute this installer to install the agent on any Windows computer.
    echo The agent will run as a Windows service and start automatically on boot.
    echo.
) else (
    echo.
    echo ERROR: Failed to build installer!
    pause
    exit /b 1
)

pause
