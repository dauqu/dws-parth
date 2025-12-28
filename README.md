# Remote Administration Tool

A comprehensive remote administration tool built in Go for Windows systems.

## Features

### 🖥️ System Monitoring
- Real-time CPU usage monitoring
- RAM usage statistics
- Disk space information
- System uptime and hostname

### 📁 File Manager
- Browse files and directories
- Create new files and folders
- Read file contents
- Delete files
- Move/rename files
- Copy files

### 🛠️ Service Manager
- List all Windows services
- View service status and startup type
- Start/Stop services
- Enable/Disable services

### 🖼️ Screen Viewer
- Capture remote screen in real-time
- View screen updates
- Remote control capabilities (keyboard & mouse)

## Architecture

- **Server** (`server.exe`): Runs on the target machine, provides system access via WebSocket API
- **Web Client** (`webclient.html`): Browser-based GUI for remote administration (no installation required)

## Installation

### Prerequisites
- Go 1.21 or higher
- Windows OS

### Building

1. Clone or download this repository
2. Open a command prompt in the project directory
3. Run the build script:
   ```
   build.bat
   ```

The executables will be created in the `bin` folder:
- `server.exe` - Deploy to remote machines
- `webclient.html` - Open in any modern browser for remote administration

## Usage

### Server Setup

1. Copy `server.exe` to the target machine
2. Run `server.exe`
3. The server will start on port 8080
4. Note the IP address of the machine

### Client Usage

1. Open `webclient.html` in any modern browser (Chrome, Firefox, Edge)
2. Enter the server address (e.g., `192.168.1.100:8080` or `localhost:8080`)
3. Click "Connect"
4. Use the tabs to access different features:
   - **System Info**: View real-time system statistics
   - **File Manager**: Browse and manage files
   - **Services**: Control Windows services
   - **Screen Viewer**: View remote screen (capture or stream)

## Security Warning

⚠️ **Important**: This tool provides significant access to remote systems. Use responsibly and only on systems you own or have explicit permission to access.

**Security Recommendations:**
1. Use on secure, trusted networks only
2. Implement authentication before deployment
3. Use TLS/SSL for encrypted connections
4. Restrict network access with firewall rules
5. Run server with minimal required privileges

## Technical Details

### Server Endpoints

- `ws://[server]:8080/ws` - General command endpoint
- `ws://[server]:8080/ws/system` - Real-time system monitoring
- `ws://[server]:8080/ws/screen` - Screen streaming
- `http://[server]:8080/status` - Health check

### Dependencies

- `github.com/gorilla/websocket` - WebSocket communication
- `github.com/shirou/gopsutil/v3` - System information
- `github.com/kbinani/screenshot` - Screen capture
- `fyne.io/fyne/v2` - GUI framework
- `golang.org/x/sys` - Windows system calls

## Building from Source

```bash
# Install dependencies
go mod download

# Build server
cd server
go build -o server.exe

# Build client
cd ../client
go build -o client.exe
```

## Troubleshooting

### Server won't start
- Check if port 8080 is available
- Run as Administrator for service management features
- Check Windows Firewall settings

### Client can't connect
- Verify server is running
- Check IP address and port
- Ensure firewall allows connections
- Try connecting from localhost first

### Service operations fail
- Server must run with Administrator privileges
- Some system services may be protected

## License

This software is provided as-is for educational and administrative purposes.

## Disclaimer

This tool is designed for legitimate system administration. Unauthorized access to computer systems is illegal. Always obtain proper authorization before deploying or using this software.
