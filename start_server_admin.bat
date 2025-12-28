@echo off
title Remote Device Management Server (Admin)
cd /d "%~dp0bin"

echo ==========================================
echo  Remote Device Management System
echo  [ADMINISTRATOR MODE]
echo ==========================================
echo.
echo Starting server with MongoDB integration...
echo Service management features ENABLED
echo.

server.exe

pause
