@echo off
echo ========================================
echo Starting Centralized Remote Admin System
echo ========================================
echo.

echo [1/3] Starting Central Server Hub...
start "Central Server Hub" bin\server_hub.exe
timeout /t 3 >nul

echo [2/3] Starting Windows Agent...
start "Windows Agent" bin\agent.exe
timeout /t 2 >nul

echo [3/3] Starting Frontend (in 5 seconds)...
echo.
echo IMPORTANT: Make sure you have run 'pnpm install' in the frontend folder
timeout /t 5 >nul
cd frontend
start "Frontend Dashboard" cmd /c "pnpm dev"
cd ..

echo.
echo ========================================
echo All Components Started!
echo ========================================
echo.
echo - Central Server: http://localhost:8080
echo - Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
