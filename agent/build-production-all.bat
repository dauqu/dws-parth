@echo off
REM Build Remote Admin Agent for Production - All Architectures
REM This builds for both AMD64 (64-bit) and 386 (32-bit) Windows systems

echo ========================================
echo Building DWS Agent for Production
echo All Windows Architectures
echo ========================================
echo.

REM Create bin directory if it doesn't exist
if not exist "..\bin" mkdir ..\bin
if not exist "..\bin\agents" mkdir ..\bin\agents

echo [1/2] Building for Windows AMD64 (64-bit)...
echo.
set GOOS=windows
set GOARCH=amd64
go build -ldflags="-s -w -X main.PRODUCTION=true -H windowsgui" -o ..\bin\agents\dws-agent-amd64.exe .

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: AMD64 build failed!
    pause
    exit /b 1
)

echo ✓ AMD64 build successful
echo.
echo [2/2] Building for Windows 386 (32-bit)...
echo.
set GOARCH=386
go build -ldflags="-s -w -X main.PRODUCTION=true -H windowsgui" -o ..\bin\agents\dws-agent-386.exe .

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: 386 build failed!
    pause
    exit /b 1
)

echo ✓ 386 build successful
echo.

REM Copy AMD64 as default
copy /Y ..\bin\agents\dws-agent-amd64.exe ..\bin\dws-agent.exe >nul

echo ========================================
echo SUCCESS! All builds completed
echo ========================================
echo.
echo Built files:
echo   - AMD64 (64-bit): ..\bin\agents\dws-agent-amd64.exe
echo   - 386 (32-bit):   ..\bin\agents\dws-agent-386.exe
echo   - Default:        ..\bin\dws-agent.exe (AMD64)
echo.
echo Features:
echo   • Silent operation (no console window)
echo   • No debug logging (PRODUCTION=true)
echo   • Optimized size (stripped symbols)
echo   • Windows service support
echo.
echo To install as a service:
echo   cd ..\installer
echo   install-service-manual.bat
echo.

dir ..\bin\agents\dws-agent-*.exe

pause
