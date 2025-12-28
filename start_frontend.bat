@echo off
echo ========================================
echo  Starting Frontend Development Server
echo ========================================
echo.
cd /d "%~dp0frontend"
echo [1/2] Installing dependencies...
call pnpm install
echo.
echo [2/2] Starting dev server...
echo.
echo Frontend will be available at:
echo  http://localhost:3000
echo.
echo Backend should be running on:
echo  http://localhost:8080
echo.
call pnpm dev
pause
