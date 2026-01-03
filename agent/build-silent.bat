@echo off
REM Build Silent Remote Admin Agent - No logs, no console, background only

echo ========================================
echo Building SILENT Remote Admin Agent
echo ========================================
echo.

REM Create bin directory if it doesn't exist
if not exist "..\bin" mkdir "..\bin"

REM Build agent with:
REM   -H windowsgui : Hide console window completely
REM   -s -w : Strip debug info (smaller executable size)
REM   -X main.PRODUCTION=true : Disable all console logging
go build -ldflags="-s -w -X main.PRODUCTION=true -H windowsgui" -o ..\bin\dws-agent-silent.exe .

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo.
    echo Silent agent built: ..\bin\dws-agent-silent.exe
    echo.
    echo Features:
    echo   - No console window
    echo   - No terminal output
    echo   - Runs completely in background
    echo   - Auto-reconnects silently
    echo.
    echo To run: Simply double-click dws-agent-silent.exe
    echo.
) else (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

pause
