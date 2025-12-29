# Testing the Agent Installation

## Quick Test - Install Service Manually

To test the agent installation without building the full installer:

1. **Build the Agent:**
   ```cmd
   cd "C:\Users\Harsh singh\Documents\go\dws-parth\agent"
   build.bat
   ```

2. **Install as Windows Service (Run as Administrator):**
   ```cmd
   cd ..\installer
   install-service-manual.bat
   ```

3. **Verify Service is Running:**
   ```cmd
   sc query RemoteAdminAgent
   ```

   You should see:
   - STATE: RUNNING
   - The service will start automatically on boot

4. **Check Logs:**
   ```cmd
   notepad "C:\ProgramData\Remote Admin Agent\agent.log"
   ```

## What You Should See

When the service runs successfully, the log file will show:
```
🖥️  Remote Admin Agent Starting...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Loaded local config: label=hhhhh, group=harshawebb
✅ Connected to central server
📝 Device registered with server
🚀 Agent running...
```

## Key Features

✅ **Runs in background** - No console window appears
✅ **Auto-starts on boot** - Service starts automatically when Windows starts
✅ **Starts immediately** - Service starts right after installation
✅ **Log file** - All output saved to `C:\ProgramData\Remote Admin Agent\agent.log`

## Managing the Service

**Check Status:**
```cmd
sc query RemoteAdminAgent
```

**Stop Service:**
```cmd
sc stop RemoteAdminAgent
```

**Start Service:**
```cmd
sc start RemoteAdminAgent
```

**Restart Service:**
```cmd
sc stop RemoteAdminAgent
timeout /t 2 /nobreak
sc start RemoteAdminAgent
```

**Uninstall Service:**
```cmd
cd installer
service-uninstall.bat
```

**View in Services Manager:**
```cmd
services.msc
```
Look for "Remote Admin Agent" in the list.

## Testing Auto-Start on Boot

1. Install the service
2. Restart your computer
3. After boot, check if the service is running:
   ```cmd
   sc query RemoteAdminAgent
   ```
4. Check the log file for the startup message

## Troubleshooting

**Service won't start:**
- Check log file: `C:\ProgramData\Remote Admin Agent\agent.log`
- Check Windows Event Viewer: eventvwr.msc → Windows Logs → Application

**Can't see any console output:**
- This is correct! The service runs in the background
- Check the log file instead

**Service starts but disconnects:**
- Check your network connection
- Verify the server URL in the agent code
- Check the log file for error messages

## Building the Full Installer

Once testing is complete, build the full installer:

```cmd
cd installer
build-installer.bat
```

This creates: `..\bin\RemoteAdminAgent-Setup.exe`

The installer will:
- Install the agent
- Create and start the Windows service
- Configure auto-start on boot
- All in one click!
