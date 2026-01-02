@echo off
REM Compile the installer builder into an executable

echo Compiling build-installer.exe...
echo.

go build -ldflags="-H windowsgui" -o build-installer.exe build-installer.go

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo Created: build-installer.exe
    echo.
    echo You can now double-click build-installer.exe to build the installer!
    echo.
) else (
    echo.
    echo ERROR: Failed to compile!
    pause
    exit /b 1
)

pause
