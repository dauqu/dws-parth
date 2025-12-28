@echo off
REM Build script for Remote Admin Tool

echo Building Remote Admin Tool...
echo.

REM Build Server
echo [1/1] Building Server...
cd server
go build -o ..\bin\server.exe -ldflags="-s -w" .
if %ERRORLEVEL% NEQ 0 (
    echo Server build failed!
    exit /b 1
)
cd ..
echo Server built successfully: bin\server.exe
echo.

REM Copy web client
echo Copying web client...
copy client\webclient.html bin\webclient.html >nul
echo Web client copied: bin\webclient.html
echo.

echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Files in the 'bin' folder:
echo   - server.exe (Run on the remote machine)
echo   - webclient.html (Open in browser on admin machine)
echo.
echo Usage:
echo   1. Run server.exe on the remote machine
echo   2. Open webclient.html in your browser
echo   3. Connect to the server IP address
echo.
pause
