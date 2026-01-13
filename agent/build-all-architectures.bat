@echo off
REM Build Remote Admin Agent for ALL Architectures
REM Builds: AMD64, 386, and ARM64

echo ========================================
echo Building DWS Agent for Production
echo ALL Windows Architectures
echo ========================================
echo.

REM Create bin directory if it doesn't exist
if not exist "..\bin" mkdir ..\bin
if not exist "..\bin\agents" mkdir ..\bin\agents

echo [1/3] Building for Windows AMD64 (64-bit Intel/AMD)...
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

echo [2/3] Building for Windows 386 (32-bit Intel/AMD)...
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

echo [3/3] Building for Windows ARM64 (ARM-based PCs)...
echo.
set GOARCH=arm64
go build -ldflags="-s -w -X main.PRODUCTION=true -H windowsgui" -o ..\bin\agents\dws-agent-arm64.exe .

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
echo SUCCESS! All builds completed
echo ========================================
echo.
echo Built files:
dir ..\bin\agents\dws-agent-*.exe
echo.
echo Default agent (AMD64): ..\bin\dws-agent.exe
echo.
echo Architecture Guide:
echo   • dws-agent-amd64.exe  - 64-bit Intel/AMD processors (most common)
echo   • dws-agent-386.exe    - 32-bit Intel/AMD processors (older systems)
echo   • dws-agent-arm64.exe  - ARM-based Windows PCs (Surface Pro X, etc.)
echo.
echo Features (all builds):
echo   ✓ Silent operation (no console window)
echo   ✓ No debug logging (optimized for production)
echo   ✓ Stripped debug symbols (smaller size)
echo   ✓ Windows service support
echo   ✓ ConPTY terminal support
echo   ✓ WebRTC screen sharing
echo.
echo To install as a service:
echo   cd ..\installer
echo   install-service-manual.bat
echo.

pause
