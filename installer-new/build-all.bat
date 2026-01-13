@echo off
REM Build Installer for All Architectures

echo ========================================
echo Building DWS Agent Installer
echo All Windows Architectures
echo ========================================
echo.

REM Create bin directory if it doesn't exist
if not exist "..\bin" mkdir ..\bin
if not exist "..\bin\installers" mkdir ..\bin\installers

echo [1/3] Building Installer for AMD64 (64-bit)...
set GOOS=windows
set GOARCH=amd64
go build -ldflags="-s -w -H windowsgui" -o ..\bin\installers\dws-installer-amd64.exe installer.go

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: AMD64 installer build failed!
    pause
    exit /b 1
)
echo ✓ AMD64 installer built successfully
echo.

echo [2/3] Building Installer for 386 (32-bit)...
set GOARCH=386
go build -ldflags="-s -w -H windowsgui" -o ..\bin\installers\dws-installer-386.exe installer.go

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: 386 installer build failed!
    pause
    exit /b 1
)
echo ✓ 386 installer built successfully
echo.

echo [3/3] Building Installer for ARM64...
set GOARCH=arm64
go build -ldflags="-s -w -H windowsgui" -o ..\bin\installers\dws-installer-arm64.exe installer.go

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ARM64 installer build failed!
    pause
    exit /b 1
)
echo ✓ ARM64 installer built successfully
echo.

REM Also build uninstaller for all architectures
echo [4/6] Building Uninstaller for AMD64...
set GOARCH=amd64
go build -ldflags="-s -w -H windowsgui" -o ..\bin\installers\dws-uninstaller-amd64.exe uninstall.go

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: AMD64 uninstaller build failed!
    pause
    exit /b 1
)
echo ✓ AMD64 uninstaller built successfully
echo.

echo [5/6] Building Uninstaller for 386...
set GOARCH=386
go build -ldflags="-s -w -H windowsgui" -o ..\bin\installers\dws-uninstaller-386.exe uninstall.go

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: 386 uninstaller build failed!
    pause
    exit /b 1
)
echo ✓ 386 uninstaller built successfully
echo.

echo [6/6] Building Uninstaller for ARM64...
set GOARCH=arm64
go build -ldflags="-s -w -H windowsgui" -o ..\bin\installers\dws-uninstaller-arm64.exe uninstall.go

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ARM64 uninstaller build failed!
    pause
    exit /b 1
)
echo ✓ ARM64 uninstaller built successfully
echo.

REM Copy AMD64 versions as default
copy /Y ..\bin\installers\dws-installer-amd64.exe ..\bin\dws-installer.exe >nul
copy /Y ..\bin\installers\dws-uninstaller-amd64.exe ..\bin\dws-uninstaller.exe >nul

echo ========================================
echo SUCCESS! All installers built
echo ========================================
echo.
echo Built files:
dir ..\bin\installers\dws-*.exe
echo.
echo Default installers (AMD64):
echo   ..\bin\dws-installer.exe
echo   ..\bin\dws-uninstaller.exe
echo.
echo Features:
echo   ✓ Auto-detects system architecture
echo   ✓ Downloads correct agent version
echo   ✓ Installs as Windows Service
echo   ✓ Auto-start on boot
echo   ✓ Recovery on failure
echo.
echo Important: Upload agent files to your server:
echo   https://dws.daucu.com/agents/dws-agent-amd64.exe
echo   https://dws.daucu.com/agents/dws-agent-386.exe
echo   https://dws.daucu.com/agents/dws-agent-arm64.exe
echo.

pause
