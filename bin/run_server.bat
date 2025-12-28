@echo off
REM Run Server Script
echo ====================================
echo Remote Admin Tool - Server
echo ====================================
echo.
echo Starting server on port 8080...
echo Server will be accessible at:
echo   - Local: http://localhost:8080
echo   - Network: http://[YOUR_IP]:8080
echo.
echo Press Ctrl+C to stop the server
echo.
echo Note: Run as Administrator for full service control
echo ====================================
echo.

cd /d "%~dp0"
server.exe

pause
