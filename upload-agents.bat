@echo off
REM Upload agents to production server

echo ========================================
echo Upload DWS Agents to Server
echo ========================================
echo.

set SERVER=ubuntu@dws-parth.daucu.com
set AGENT_DIR=bin\agents
set REMOTE_TMP=/tmp/dws-agents

echo This script will upload agent files to your server.
echo.
echo Server: %SERVER%
echo Local:  %AGENT_DIR%
echo Remote: %REMOTE_TMP% (then moved to /var/www/dws-agents/)
echo.
echo Files to upload:
dir %AGENT_DIR%\dws-agent-*.exe
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo [1/3] Uploading agents to server...
scp %AGENT_DIR%\dws-agent-*.exe %SERVER%:%REMOTE_TMP%/

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Upload failed!
    echo.
    echo Make sure:
    echo   1. SSH key is configured
    echo   2. Server hostname is correct
    echo   3. User has permission
    echo.
    pause
    exit /b 1
)

echo ✓ Upload complete
echo.
echo [2/3] Moving files to web directory...
ssh %SERVER% "sudo mkdir -p /var/www/dws-agents && sudo mv %REMOTE_TMP%/*.exe /var/www/dws-agents/ && sudo chmod 644 /var/www/dws-agents/*.exe && sudo chown www-data:www-data /var/www/dws-agents/*.exe"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  Warning: Failed to move files on server
    echo You may need to manually move files from %REMOTE_TMP%
    echo.
    pause
    exit /b 1
)

echo ✓ Files moved and permissions set
echo.
echo [3/3] Verifying upload...
ssh %SERVER% "ls -lh /var/www/dws-agents/"

echo.
echo ========================================
echo SUCCESS! Agents uploaded to server
echo ========================================
echo.
echo Next steps:
echo   1. Configure nginx (see DEPLOYMENT_GUIDE.md)
echo   2. Test download: curl -I https://dws.daucu.com/agents/dws-agent-amd64.exe
echo   3. Distribute installers from bin\installers\
echo.
pause
