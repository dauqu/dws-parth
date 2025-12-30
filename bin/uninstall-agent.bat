@echo off
REM Uninstall DWS Agent - Remove from system completely

REM Check for admin rights, if not admin then relaunch as admin
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting Administrator privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    pushd "%CD%"
    CD /D "%~dp0"

setlocal EnableDelayedExpansion

set "INSTALL_DIR=%ProgramData%\DWSAgent"
set "AGENT_PATH=%INSTALL_DIR%\dws-agent.exe"

REM Stop the running process
taskkill /F /IM dws-agent.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Remove from Windows Registry startup
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DWSAgent" /f >nul 2>&1

REM Remove startup shortcut
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DWS Agent.lnk" >nul 2>&1

REM Remove Windows Defender exclusion
powershell -Command "Remove-MpPreference -ExclusionPath '%INSTALL_DIR%'" >nul 2>&1

REM Delete the install folder
rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1

echo DWS Agent has been completely removed from the system.
timeout /t 3

exit /b 0
