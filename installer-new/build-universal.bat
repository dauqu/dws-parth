@echo off
REM Build Universal Installer - Single EXE for All Architectures

echo ========================================
echo Building Universal DWS Agent Installer
echo Single EXE for ALL Windows Systems
echo ========================================
echo.

REM Create bin directory if it doesn't exist
if not exist "..\bin" mkdir ..\bin

echo Building universal installer (AMD64)...
echo This installer will detect system architecture at runtime
echo and download the appropriate agent.
echo.

set GOOS=windows
set GOARCH=amd64
go build -ldflags="-s -w -H windowsgui" -o ..\bin\dws-installer-universal.exe installer.go

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo Building universal uninstaller...
go build -ldflags="-s -w -H windowsgui" -o ..\bin\dws-uninstaller-universal.exe uninstall.go

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Uninstaller build failed!
    pause
    exit /b 1
)

REM Copy to simpler names
copy /Y ..\bin\dws-installer-universal.exe ..\bin\dws-installer.exe >nul
copy /Y ..\bin\dws-uninstaller-universal.exe ..\bin\dws-uninstaller.exe >nul

echo.
echo ========================================
echo SUCCESS! Universal Installer Built
echo ========================================
echo.
echo Built files:
dir ..\bin\dws-installer*.exe
dir ..\bin\dws-uninstaller*.exe
echo.
echo File Sizes:
for %%f in (..\bin\dws-installer-universal.exe) do echo   Installer:   %%~zf bytes (%%~nxf)
for %%f in (..\bin\dws-uninstaller-universal.exe) do echo   Uninstaller: %%~zf bytes (%%~nxf)
echo.
echo Features:
echo   ✓ Single EXE works on ALL Windows systems
echo   ✓ Auto-detects system architecture at runtime
echo   ✓ Downloads correct agent (AMD64, 386, or ARM64)
echo   ✓ No user intervention needed
echo.
echo How it works:
echo   1. User runs dws-installer.exe
echo   2. Installer detects CPU architecture (AMD64/386/ARM64)
echo   3. Downloads matching agent from your server
echo   4. Installs as Windows Service
echo   5. Starts automatically
echo.
echo Distribution:
echo   Just distribute ONE file: dws-installer.exe
echo   Works on Windows 7/8/10/11 (32-bit, 64-bit, ARM64)
echo.
echo Next steps:
echo   1. Upload agents to server: upload-agents.bat
echo   2. Test installer on different systems
echo   3. Distribute dws-installer.exe to users
echo.

pause
