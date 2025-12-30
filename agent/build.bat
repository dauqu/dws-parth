@echo off
REM Build Remote Admin Agent with Windows Service support

echo Building Remote Admin Agent (Production)...
echo.

REM Build agent with:
REM   -H windowsgui : Hide console window
REM   -s -w : Strip debug info (smaller size)
REM   -X main.PRODUCTION=true : Disable all console logging
go build -ldflags="-s -w -X main.PRODUCTION=true -H windowsgui" -o ..\bin\dws-agent.exe .

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo Agent built successfully: ..\bin\dws-agent.exe
    echo.
    echo The agent will run silently in background (no console window, no logs).
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
