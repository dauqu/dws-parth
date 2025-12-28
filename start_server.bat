@echo off
title Remote Device Management Server
cd /d "%~dp0bin"

echo ==========================================
echo  Remote Device Management System
echo ==========================================
echo.
echo Starting server with MongoDB integration...
echo.

server.exe

pause
