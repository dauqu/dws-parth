# Quick Start Guide

## 1. Start Backend Server

```powershell
cd "c:\Users\Harsh singh\Documents\go\dws-parth\bin"
.\server.exe
```

**For service management features, run as Administrator:**
- Right-click `server.exe` → Run as Administrator

## 2. Start Frontend

```powershell
cd "c:\Users\Harsh singh\Documents\go\dws-parth\frontend"
pnpm dev
```

## 3. Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Server Status**: http://localhost:8080/status

## 4. Test the Connection

Open browser to http://localhost:3000 and you should see:
- Device Dashboard with connected devices
- Your current device registered automatically

## 5. Features to Try

### Device Management
1. Click on a device card to view details
2. See real-time system metrics (CPU, RAM, Disk)
3. Check device status and connection

### File Manager
1. Navigate to Files tab
2. Double-click folders to open them
3. Double-click files to download
4. Use breadcrumb navigation

### Screen Control
1. Go to Screen tab
2. Click "Start Screen Stream"
3. Click "Enable Control" for mouse/keyboard
4. Click on screen to control remote mouse

### Remote Shell
1. Open Shell tab
2. Switch between PowerShell and CMD
3. Type commands and click Execute
4. Export logs if needed

### Services
1. Go to Services tab
2. View all Windows services
3. Start/Stop/Restart services
4. Enable/Disable service startup

## API Testing

Test REST endpoints with curl or Postman:

```powershell
# Get all devices
curl http://localhost:8080/api/devices

# Get system info
curl http://localhost:8080/api/system

# List files
curl "http://localhost:8080/api/files?path=C:\"

# Server status
curl http://localhost:8080/status
```

## Troubleshooting

**Server won't start:**
- Check if port 8080 is free
- Verify MongoDB connection

**Frontend can't connect:**
- Ensure server is running
- Check `.env.local` settings

**Services don't work:**
- Run server as Administrator

**Screen streaming is slow:**
- Check network connection
- Try adjusting quality settings

## Next Steps

1. Register multiple devices from different computers
2. Access the dashboard to manage all devices
3. Explore the REST API documentation
4. Set up authentication for production use

---

Need help? Check [README_FULL.md](README_FULL.md) for complete documentation.
