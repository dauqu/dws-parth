@echo off
REM Build Remote Admin Agent for Production - Windows ARM64
REM For Windows ARM devices (Surface Pro X, etc.)

echo ========================================
echo Building DWS Agent for Production
echo Windows ARM64
echo ========================================
echo.

REM Create bin directory if it doesn't exist
if not exist "..\bin" mkdir ..\bin
if not exist "..\bin\agents" mkdir ..\bin\agents

echo Building for Windows ARM64...
echo.
set GOOS=windows
set GOARCH=arm64
go build -ldflags="-s -w -X main.PRODUCTION=true -H windowsgui" -o ..\bin\agents\dws-agent-arm64.exe .

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ARM64 build failed!
    pause
    exit /b 1
)

echo ========================================
echo SUCCESS! ARM64 build completed
echo ========================================
echo.
echo Built file:
echo   ..\bin\agents\dws-agent-arm64.exe
echo.
echo Features:
echo   • Silent operation (no console window)
echo   • No debug logging (PRODUCTION=true)
echo   • Optimized size (stripped symbols)
echo   • Windows service support
echo   • ARM64 native performance
echo.

dir ..\bin\agents\dws-agent-arm64.exe

pause
