@echo off
REM Test Installer Build - Uses Local Server

echo ========================================
echo Building TEST Installer (Local Server)
echo ========================================
echo.

echo This will build an installer that downloads from:
echo   http://localhost:8080/agents/
echo.

REM Temporarily modify the URL for testing
powershell -Command "(Get-Content installer.go) -replace 'https://dws.daucu.com/agents', 'http://localhost:8080/agents' | Set-Content installer-test.go"

echo Building test installer...
go build -ldflags="-s -w" -o test-installer.exe installer-test.go

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed!
    del installer-test.go 2>nul
    pause
    exit /b 1
)

REM Clean up temporary file
del installer-test.go 2>nul

echo.
echo ========================================
echo SUCCESS! Test Installer Built
echo ========================================
echo.
echo File: test-installer.exe
echo.
echo IMPORTANT: Make sure the HTTP server is running!
echo   Run: python -m http.server 8080
echo   From: bin\ directory
echo.
echo Then run as Administrator: test-installer.exe
echo.
pause
