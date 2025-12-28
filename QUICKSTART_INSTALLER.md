# Quick Start Guide - Installing Agent as Windows Service

## Option 1: Quick Install (No Installer Builder Required) ⚡

If you just want to test the agent as a Windows service without building a full installer:

1. **Open PowerShell or Command Prompt as Administrator**
   - Right-click on PowerShell/CMD → "Run as administrator"

2. **Navigate to installer directory:**
   ```cmd
   cd "C:\Users\Harsh singh\Documents\go\dws-parth\installer"
   ```

3. **Run the manual installer:**
   ```cmd
   install-service-manual.bat
   ```

4. **Done!** The agent is now:
   - Installed in `C:\Program Files\Remote Admin Agent\`
   - Running as a Windows service
   - Will auto-start on every boot

### Check if it's running:
```cmd
sc query RemoteAdminAgent
```

### To uninstall:
```cmd
uninstall-service-manual.bat
```

---

## Option 2: Build Professional Installer 📦

For distribution to other computers, create a professional installer:

### Step 1: Install Inno Setup
1. Download from: https://jrsoftware.org/isdl.php
2. Install to default location

### Step 2: Build the Installer
1. Open Command Prompt as Administrator
2. Navigate to installer directory:
   ```cmd
   cd "C:\Users\Harsh singh\Documents\go\dws-parth\installer"
   ```
3. Run:
   ```cmd
   build-installer.bat
   ```

### Step 3: Distribute
The installer will be created at:
```
..\bin\RemoteAdminAgent-Setup.exe
```

You can now copy this file to any Windows computer and install it!

---

## Features ✨

✅ **Auto-starts on boot** - No manual intervention needed  
✅ **Runs in background** - No visible window  
✅ **Runs as Windows Service** - Reliable and always running  
✅ **Auto-restart on crash** - Service restarts automatically if it crashes  
✅ **Administrator privileges** - Full system access  
✅ **Easy uninstall** - Standard Windows uninstall process  

---

## Managing the Service

### View in Services Manager
1. Press `Win + R`
2. Type: `services.msc`
3. Find: "Remote Admin Agent"

### Command Line
```cmd
# Check status
sc query RemoteAdminAgent

# Start
sc start RemoteAdminAgent

# Stop
sc stop RemoteAdminAgent

# Restart
sc stop RemoteAdminAgent && timeout /t 2 && sc start RemoteAdminAgent
```

---

## Configuration

### Change Server URL
Before installing, edit the server URL in `agent/main.go`:

```go
const (
    SERVER_URL = "ws://YOUR_SERVER_IP:8080/ws/client"
)
```

Then rebuild:
```cmd
cd agent
go build -o ..\bin\agent.exe .
```

---

## Troubleshooting 🔧

### Service won't start
1. Check if server is running and accessible
2. Verify firewall allows connection to port 8080
3. Check Event Viewer (Windows Logs → Application)

### Can't connect to server
1. Test connection manually:
   ```cmd
   Test-NetConnection YOUR_SERVER_IP -Port 8080
   ```
2. Make sure server URL in agent code is correct
3. Check network/firewall settings

### Service crashes
- View logs in Event Viewer
- Service will auto-restart (configured with 3 retry attempts)

---

## Silent Installation (for IT deployment)

Install without any UI:
```cmd
RemoteAdminAgent-Setup.exe /VERYSILENT /NORESTART
```

Install with progress bar but no prompts:
```cmd
RemoteAdminAgent-Setup.exe /SILENT /NORESTART
```

---

## Next Steps

After installation:
1. Open your web dashboard: http://localhost:3000/dashboard
2. The device should appear automatically
3. Click on the device to manage it

Enjoy your automated remote admin system! 🎉
