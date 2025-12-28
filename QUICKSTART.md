# Quick Start Guide - Remote Admin Tool

## 🚀 Quick Setup (5 minutes)

### Step 1: Build the Application
1. Open Command Prompt or PowerShell
2. Navigate to the project folder
3. Run: `build.bat`
4. Wait for build to complete

### Step 2: Start the Server
1. Go to the `bin` folder
2. Run `server.exe`
3. The server will start on port 8080
4. Note: Run as Administrator for full service management capabilities

### Step 3: Connect with Web Client
1. Open `bin/webclient.html` in your web browser
2. Enter server address:
   - Same machine: `localhost:8080`
   - Remote machine: `192.168.x.x:8080` (use the actual IP)
3. Click "Connect"

## 📋 Features Overview

### 1. System Monitoring
- **Real-time CPU usage** - See current processor load
- **Memory statistics** - Total, used, and available RAM
- **Disk information** - Storage capacity and usage
- **System details** - Hostname, uptime, OS info

### 2. File Manager
- **Browse directories** - Navigate through any folder
- **View file details** - Name, size, modified date
- **File operations** - Create, delete, move, copy files
- **Directory management** - Create new folders

### 3. Service Manager
- **List all services** - View all Windows services
- **Check status** - Running, stopped, or disabled
- **Start/Stop** - Control service execution
- **Enable/Disable** - Change startup configuration

### 4. Screen Viewer
- **Screen capture** - Take single screenshots
- **Live streaming** - Real-time screen updates
- **Remote viewing** - Monitor remote desktop activity

## 🔒 Security Notes

⚠️ **IMPORTANT**: This tool provides significant system access!

**Before Using:**
1. Only use on systems you own or have permission to access
2. Use on trusted, secure networks (avoid public WiFi)
3. Consider running server behind a firewall
4. For production use, add authentication
5. Run server with minimal required privileges when possible

## 🛠️ Troubleshooting

### Server won't start
**Problem**: Error starting server
**Solutions**:
- Check if port 8080 is already in use
- Try running as Administrator
- Check Windows Firewall settings
- Verify antivirus isn't blocking

### Can't connect from web client
**Problem**: Connection failed or timeout
**Solutions**:
- Verify server is running
- Check IP address (use `ipconfig` to find it)
- Ensure firewall allows port 8080
- Try `localhost:8080` first if on same machine
- Make sure both devices are on same network

### Service operations not working
**Problem**: Can't start/stop services
**Solution**: Run `server.exe` as Administrator (right-click → Run as administrator)

### Screen capture not working
**Problem**: No screen image appears
**Solutions**:
- Refresh the connection
- Check server logs for errors
- Verify graphics drivers are up to date
- Some systems may require additional permissions

## 📡 Network Setup

### Testing Locally
```
Server: localhost:8080
Client: Open webclient.html, connect to "localhost:8080"
```

### Remote Connection (Same Network)
1. Find server's IP address:
   - Open Command Prompt
   - Run: `ipconfig`
   - Look for "IPv4 Address" (e.g., 192.168.1.105)
2. On admin machine:
   - Open webclient.html
   - Connect to: `192.168.1.105:8080`

### Firewall Configuration
Allow incoming connections on port 8080:
```powershell
netsh advfirewall firewall add rule name="Remote Admin Server" dir=in action=allow protocol=TCP localport=8080
```

## 🎯 Usage Examples

### Example 1: Monitor Server Resources
1. Connect to server
2. Go to "System Info" tab
3. Click "Refresh System Info"
4. View CPU, RAM, and disk usage in real-time

### Example 2: Manage Files
1. Connect to server
2. Go to "File Manager" tab
3. Enter path (e.g., `C:\Users`)
4. Click "List Files"
5. Browse and manage files

### Example 3: Control Services
1. Connect to server
2. Go to "Services" tab
3. Click "List Services"
4. Find a service and click Start/Stop

### Example 4: View Screen
1. Connect to server
2. Go to "Screen Viewer" tab
3. Click "Capture Screen" for single capture
4. Or click "Start Stream" for continuous updates
5. Click "Stop Stream" when done

## 💡 Tips & Best Practices

1. **Run server as service**: Use Windows Task Scheduler to auto-start
2. **Monitor performance**: Check CPU usage in System Info tab regularly
3. **Backup before file operations**: Always backup important data
4. **Test services carefully**: Some services are critical to Windows
5. **Use secure networks**: Avoid using on public or untrusted networks

## 🔧 Advanced Configuration

### Change Server Port
Edit `server/main.go`, find:
```go
port := ":8080"
```
Change to desired port, then rebuild.

### Increase Screen Quality
Edit `server/screen.go`, find:
```go
jpeg.Encode(&buf, img, &jpeg.Options{Quality: 60})
```
Increase quality (1-100), then rebuild.

## 📞 Need Help?

Common issues:
- **"Not connected to server"**: Server not running or wrong address
- **"Connection failed"**: Firewall blocking or wrong IP
- **"Error reading response"**: Server may have crashed
- **Blank screen**: Capture failed, check permissions

## ✅ Verification Checklist

Before reporting issues, verify:
- [ ] Server.exe is running
- [ ] Firewall allows port 8080
- [ ] Correct IP address used
- [ ] Both devices on same network (for remote)
- [ ] Browser console shows no errors (F12)
- [ ] Server running as Administrator (for services)

## 🎓 Learning Resources

**Understanding Components:**
- **WebSocket**: Real-time bidirectional communication
- **JSON**: Data format for messages
- **Go**: Server programming language
- **HTML/JavaScript**: Web client interface

**Go Packages Used:**
- `gorilla/websocket`: WebSocket protocol
- `gopsutil`: System information
- `screenshot`: Screen capture
- `windows/svc`: Service management

---

**Version**: 1.0  
**Built with**: Go 1.21+  
**Platform**: Windows  
**License**: Educational/Administrative Use
