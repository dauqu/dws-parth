# DWS Agent Installer - Architecture Detection

This installer automatically detects the system architecture and downloads the appropriate agent version.

## Build Installers

```bash
# Build for all architectures
build-all.bat
```

This creates:
- `dws-installer-amd64.exe` - 64-bit systems
- `dws-installer-386.exe` - 32-bit systems  
- `dws-installer-arm64.exe` - ARM64 systems
- `dws-uninstaller-amd64.exe` - 64-bit uninstaller
- `dws-uninstaller-386.exe` - 32-bit uninstaller
- `dws-uninstaller-arm64.exe` - ARM64 uninstaller

## Architecture Detection

The installer automatically:
1. Detects the system architecture (AMD64, 386, or ARM64)
2. Downloads the matching agent from your server
3. Installs it as a Windows Service
4. Configures auto-start and recovery

## Server Setup Required

Upload your built agents to your web server:

```
https://dws.daucu.com/agents/
├── dws-agent-amd64.exe
├── dws-agent-386.exe
└── dws-agent-arm64.exe
```

### Using Nginx

Add to your nginx config:

```nginx
location /agents/ {
    alias /var/www/dws-agents/;
    autoindex off;
    
    # Allow downloads
    add_header Content-Disposition 'attachment';
    
    # CORS for downloads
    add_header Access-Control-Allow-Origin *;
}
```

Upload files:
```bash
# On your server
sudo mkdir -p /var/www/dws-agents
sudo cp dws-agent-*.exe /var/www/dws-agents/
sudo chmod 644 /var/www/dws-agents/*.exe
sudo chown www-data:www-data /var/www/dws-agents/*.exe
```

## Distribution

### Option 1: Single Installer
Distribute `dws-installer-amd64.exe` to most users (covers 95%+ of systems)

### Option 2: Architecture-Specific
- **dws-installer-amd64.exe** - Modern PCs (Windows 10/11 64-bit)
- **dws-installer-386.exe** - Older PCs (Windows 7/8 32-bit)
- **dws-installer-arm64.exe** - ARM Windows (Surface Pro X)

### Option 3: Smart Installer
Create a launcher that detects architecture and runs the correct installer.

## Installation Process

When users run the installer:

1. ✅ Checks for Administrator privileges
2. 🔍 Detects system architecture (AMD64, 386, or ARM64)
3. 📁 Creates installation directory: `C:\Program Files\RemoteAdmin`
4. ⬇️ Downloads appropriate agent from your server
5. 🛑 Stops any existing service
6. 🗑️ Removes old service registration
7. ⚙️ Installs new Windows Service
8. 🔧 Configures auto-start and recovery
9. ▶️ Starts the service

## Configuration

Edit `installer.go` to customize:

```go
const (
    DOWNLOAD_BASE_URL = "https://dws.daucu.com/agents"  // Your server URL
    SERVICE_NAME      = "RemoteAdminAgent"              // Service name
    INSTALL_DIR       = "C:\\Program Files\\RemoteAdmin" // Install location
    EXE_NAME          = "dws-agent.exe"                 // Executable name
)
```

## Testing

### Test Installation
1. Build the installer: `build-all.bat`
2. Copy installer to a test machine
3. Run as Administrator
4. Check Services (services.msc) for "RemoteAdminAgent"
5. Verify connection on your dashboard

### Test Uninstallation
1. Run the uninstaller as Administrator
2. Check that service is removed
3. Verify files are deleted

## Troubleshooting

### Download Failed
- Check that agent files are uploaded to your server
- Verify URL: `https://dws.daucu.com/agents/dws-agent-amd64.exe`
- Check firewall/antivirus isn't blocking downloads

### Service Won't Start
- Check Windows Event Viewer for errors
- Verify agent connects to server: `wss://dws-parth.daucu.com/ws/client`
- Check Windows Defender hasn't quarantined the agent

### Wrong Architecture
- The installer auto-detects architecture
- To force a specific version, run the appropriate installer directly
- Check system architecture: `wmic os get osarchitecture`

## Silent Installation

For automated deployment:

```batch
REM Silent install (no GUI)
dws-installer.exe /S

REM Silent uninstall
dws-uninstaller.exe /S
```

## Advanced: Custom Build

Build with custom settings:

```bash
# Custom server URL
go build -ldflags="-s -w -X main.DOWNLOAD_BASE_URL=https://your-server.com/agents" -o installer.exe installer.go

# Different service name
go build -ldflags="-s -w -X main.SERVICE_NAME=MyAgent" -o installer.exe installer.go
```
