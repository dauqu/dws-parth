@echo off
REM Build DWS Agent for Production with Server URL
REM All Windows Architectures + Production Server

echo ========================================
echo Building DWS Agent for Production
echo Server: wss://dws-parth.daucu.com
echo All Windows Architectures
echo ========================================
echo.

REM Create bin directory if it doesn't exist
if not exist "..\bin" mkdir ..\bin
if not exist "..\bin\agents" mkdir ..\bin\agents

set SERVER_URL=wss://dws-parth.daucu.com/ws/client
set BUILD_FLAGS=-s -w -X main.PRODUCTION=true -X main.SERVER_URL=%SERVER_URL% -H windowsgui

echo Server URL: %SERVER_URL%
echo.

echo [1/3] Building for Windows AMD64 (64-bit Intel/AMD)...
set GOOS=windows
set GOARCH=amd64
go build -ldflags="%BUILD_FLAGS%" -o ..\bin\agents\dws-agent-amd64.exe .

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: AMD64 build failed!
    pause
    exit /b 1
)
echo ✓ AMD64 build successful
echo.

echo [2/3] Building for Windows 386 (32-bit Intel/AMD)...
set GOARCH=386
go build -ldflags="%BUILD_FLAGS%" -o ..\bin\agents\dws-agent-386.exe .

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: 386 build failed!
    pause
    exit /b 1
)
echo ✓ 386 build successful
echo.

echo [3/3] Building for Windows ARM64 (ARM-based PCs)...
set GOARCH=arm64
go build -ldflags="%BUILD_FLAGS%" -o ..\bin\agents\dws-agent-arm64.exe .

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ARM64 build failed!
    pause
    exit /b 1
)
echo ✓ ARM64 build successful
echo.

REM Copy AMD64 as default
copy /Y ..\bin\agents\dws-agent-amd64.exe ..\bin\dws-agent.exe >nul

echo ========================================
echo SUCCESS! All production builds completed
echo ========================================
echo.
echo Built files:
dir ..\bin\agents\dws-agent-*.exe
echo.
echo Default: ..\bin\dws-agent.exe (AMD64)
echo.
echo Configuration:
echo   Server:     wss://dws-parth.daucu.com/ws/client
echo   Mode:       Production (silent, no logs)
echo   Optimized:  Yes (stripped symbols)
echo.
echo Architectures:
echo   • AMD64  - 64-bit Intel/AMD (most common)
echo   • 386    - 32-bit Intel/AMD (older systems)
echo   • ARM64  - ARM-based Windows (Surface Pro X, etc.)
echo.
echo Next steps:
echo   1. Test the agent: Run dws-agent.exe manually
echo   2. Install as service: cd ..\installer ^& install-service-manual.bat
echo   3. Distribute: Share the appropriate .exe for target systems
echo.

pause
