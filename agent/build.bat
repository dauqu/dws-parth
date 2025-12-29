@echo off
REM Build Remote Admin Agent with Windows Service support

echo Building Remote Admin Agent...
echo.

REM Build agent with windowsgui flag to hide console window
go build -ldflags="-H windowsgui" -o ..\bin\dws-agent.exe .

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo Agent built successfully: ..\bin\dws-agent.exe
    echo.
    echo The agent will run as a background Windows service (no console window).
    echo.
    echo To install as a service:
    echo   cd ..\installer
    echo   install-service-manual.bat
    echo.
) else (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

pause
