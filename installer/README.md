# Remote Admin Agent - Windows Installer

This installer creates a Windows service that runs the Remote Admin Agent in the background and starts automatically on system boot.

## Prerequisites

1. **Inno Setup** - Download and install from: https://jrsoftware.org/isdl.php
   - Use the default installation location
   - Version 6 or higher recommended

## Building the Installer

### Method 1: Using the Build Script (Recommended)

1. Open Command Prompt or PowerShell as Administrator
2. Navigate to the installer directory:
   ```cmd
   cd "C:\Users\Harsh singh\Documents\go\dws-parth\installer"
   ```
3. Run the build script:
   ```cmd
   build-installer.bat
   ```
4. The installer will be created at: `..\bin\RemoteAdminAgent-Setup.exe`

### Method 2: Manual Build

1. Build the agent first:
   ```cmd
   cd ..\agent
   go build -o ..\bin\agent.exe .
   ```
2. Open `setup.iss` in Inno Setup Compiler
3. Click "Compile" or press F9
4. The installer will be created in `..\bin\`

## What the Installer Does

1. **Installs the agent** to `C:\Program Files\Remote Admin Agent\`
2. **Creates a Windows Service** named "RemoteAdminAgent"
3. **Configures auto-start** on system boot (automatic startup)
4. **Starts the service** immediately after installation
5. **Configures automatic restart** if the service crashes
6. **Runs as Local System** account for full privileges
7. **Runs in background** - no console window visible
8. **Logs to file** at `C:\ProgramData\Remote Admin Agent\agent.log`

## Installation

1. Run `RemoteAdminAgent-Setup.exe` as Administrator
2. Follow the installation wizard
3. The service will start automatically

## Service Management

### Check Service Status
```cmd
sc query RemoteAdminAgent
```

### Start Service
```cmd
sc start RemoteAdminAgent
```

### Stop Service
```cmd
sc stop RemoteAdminAgent
```

### Restart Service
```cmd
sc stop RemoteAdminAgent
timeout /t 2
sc start RemoteAdminAgent
```

### View Service in Services Manager
1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find "Remote Admin Agent" in the list

## Uninstallation

### Method 1: Using Windows Settings
1. Go to Settings > Apps > Installed apps
2. Find "Remote Admin Agent"
3. Click Uninstall

### Method 2: Using Control Panel
1. Open Control Panel > Programs > Programs and Features
2. Find "Remote Admin Agent"
3. Click Uninstall

### Method 3: Silent Uninstall
```cmd
"C:\Program Files\Remote Admin Agent\unins000.exe" /SILENT
```

## Configuration

To change the server URL, edit the agent configuration before building:
- Edit `agent/main.go` and change the `SERVER_URL` constant
- Rebuild the agent
- Build the installer again

## Logs

Service logs are available in:
- Windows Event Viewer (Application logs)
- Service log file (if configured in the agent)

## Troubleshooting

### Service won't start
1. Check if port 8080 is accessible from the client machine
2. Verify the server is running
3. Check Windows Firewall settings
4. View service logs in Event Viewer

### Service crashes
- The service is configured to automatically restart on failure
- Check Event Viewer for error details

### Installer requires admin rights
- Right-click the installer and select "Run as administrator"

## Customization

### Change Application Name
Edit `setup.iss` and modify:
```
#define MyAppName "Your Custom Name"
```

### Add Custom Icon
1. Place your .ico file in `assets\icon.ico`
2. Rebuild the installer

### Change Install Location
Edit `setup.iss` and modify:
```
DefaultDirName={autopf}\YourCustomFolder
```

## Silent Installation

For enterprise deployment, you can install silently:
```cmd
RemoteAdminAgent-Setup.exe /SILENT /NORESTART
```

Or fully silent (no progress dialog):
```cmd
RemoteAdminAgent-Setup.exe /VERYSILENT /NORESTART
```

## Distribution

The created installer (`RemoteAdminAgent-Setup.exe`) is standalone and can be distributed to any Windows computer without any dependencies.

System Requirements:
- Windows 7 or later
- Administrator privileges for installation
- Network access to the central server
