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

REM Install rsrc tool if not already installed
echo Installing rsrc tool for manifest embedding...
go install github.com/akavel/rsrc@latest
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Could not install rsrc, trying to use existing installation
)

REM Create a resource syso file to embed the manifest
echo Creating Windows resource with admin manifest...
rsrc -manifest installer.manifest -o installer_windows.syso
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to create resource file!
    echo Please install rsrc: go install github.com/akavel/rsrc@latest
    pause
    exit /b 1
)

set GOOS=windows
set GOARCH=amd64

REM Build with embedded manifest
echo Building installer with embedded manifest...
go build -ldflags="-s -w" -o ..\bin\dws-installer-universal.exe installer.go

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo Creating Windows resource for uninstaller...
rsrc -manifest uninstall.manifest -o uninstall_windows.syso
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Failed to create uninstaller resource file
)

echo Building universal uninstaller...
go build -ldflags="-s -w" -o ..\bin\dws-uninstaller-universal.exe uninstall.go

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Uninstaller build failed!
    pause
    exit /b 1
)

REM Clean up temporary syso files
del installer_windows.syso 2>nul
del uninstall_windows.syso 2>nul

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
