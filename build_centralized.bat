@echo off
echo ========================================
echo Building Centralized Remote Admin System
echo ========================================
echo.

echo [1/2] Building Central Server (Hub)...
cd server
go build -o ..\bin\server_hub.exe main_hub.go database.go
if errorlevel 1 (
    echo ERROR: Server build failed!
    pause
    exit /b 1
)
echo ✓ Server built successfully
echo.

echo [2/2] Building Windows Agent (Client)...
cd ..\agent
go build -o ..\bin\agent.exe main.go
if errorlevel 1 (
    echo ERROR: Agent build failed!
    pause
    exit /b 1
)
echo ✓ Agent built successfully
echo.

echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Executables:
echo   - bin\server_hub.exe (Central Server)
echo   - bin\agent.exe      (Windows Agent)
echo.
pause
