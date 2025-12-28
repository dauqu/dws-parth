@echo off
REM Open Web Client Script
echo ====================================
echo Remote Admin Tool - Web Client
echo ====================================
echo.
echo Opening web client in default browser...
echo.
echo After the browser opens:
echo 1. Enter server address (e.g., localhost:8080)
echo 2. Click Connect
echo 3. Use the tabs to access features
echo.
echo ====================================
echo.

cd /d "%~dp0"
start webclient.html

echo Web client opened!
echo.
pause
