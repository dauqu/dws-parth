@echo off
REM Build Remote Admin Agent for LOCAL TESTING

echo ========================================
echo Building TEST Agent (Local Server)
echo ========================================
echo.

REM Build test agent with console visible for debugging
go build -ldflags="-X main.SERVER_URL=ws://localhost:8080/ws/client" -o ..\bin\dws-agent-test.exe .

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo Test agent built: ..\bin\dws-agent-test.exe
    echo.
    echo This agent connects to: ws://localhost:8080/ws/client
    echo.
    echo Make sure your local server is running:
    echo   cd ..\server
    echo   go run .
    echo.
) else (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

pause
