# DWS Agent - Production Build Guide

## Quick Start

### Build for Production (All Architectures)
```bash
# Windows
build-prod-release.bat

# Linux/Mac
chmod +x build-prod-release.sh
./build-prod-release.sh
```

This creates agents for:
- **AMD64** (64-bit Intel/AMD) - Most common
- **386** (32-bit Intel/AMD) - Legacy systems
- **ARM64** (ARM Windows) - Surface Pro X, etc.

## Build Scripts

### Production Builds (Recommended)

#### `build-prod-release.bat` / `build-prod-release.sh`
**Complete production build for all architectures**
- Server: `wss://dws-parth.daucu.com/ws/client`
- Silent mode (no console window)
- No debug logging
- Optimized binary size
- All 3 architectures

#### `build-all-architectures.bat`
**Local testing with all architectures**
- Server: `ws://localhost:8080/ws/client`
- Same features as production
- Good for testing before deployment

### Development Builds

#### `build.bat`
**Standard production build (AMD64 only)**
- Silent mode
- Single architecture (AMD64)
- Default server: localhost

#### `build-test.bat`
**Development build with console**
- Shows console window
- Debug logging enabled
- For testing and debugging

#### `build-silent.bat`
**Production build without logs**
- No console window
- No logging
- AMD64 only

## Output Files

```
bin/
├── dws-agent.exe                    # Default (AMD64)
└── agents/
    ├── dws-agent-amd64.exe         # 64-bit Intel/AMD
    ├── dws-agent-386.exe           # 32-bit Intel/AMD
    └── dws-agent-arm64.exe         # ARM64 Windows
```

## Architecture Selection Guide

| Architecture | Use Case | Systems |
|-------------|----------|---------|
| **AMD64** | Most modern PCs | Windows 10/11 (64-bit) |
| **386** | Older systems | Windows 7/8/10 (32-bit) |
| **ARM64** | ARM-based Windows | Surface Pro X, ARM laptops |

## Build Parameters

All production builds use these flags:
```bash
-ldflags="-s -w -X main.PRODUCTION=true -X main.SERVER_URL=wss://dws-parth.daucu.com/ws/client -H windowsgui"
```

- `-s -w` - Strip debug symbols (smaller file)
- `-X main.PRODUCTION=true` - Disable console logging
- `-X main.SERVER_URL=...` - Set WebSocket server URL
- `-H windowsgui` - Hide console window (Windows only)

## Custom Server URL

To build with a different server:

### Windows
```bat
set SERVER_URL=wss://your-server.com/ws/client
set BUILD_FLAGS=-s -w -X main.PRODUCTION=true -X main.SERVER_URL=%SERVER_URL% -H windowsgui
go build -ldflags="%BUILD_FLAGS%" -o dws-agent.exe .
```

### Linux/Mac
```bash
SERVER_URL="wss://your-server.com/ws/client"
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w -X main.PRODUCTION=true -X main.SERVER_URL=$SERVER_URL -H windowsgui" -o dws-agent.exe .
```

## Installation

After building, install the agent as a Windows service:

```bash
cd ..\installer
install-service-manual.bat
```

Or use the installer:
```bash
cd ..\installer
build-installer.bat
```

## Features

All production builds include:
- ✅ Windows Service support
- ✅ PowerShell & CMD terminal
- ✅ File manager
- ✅ Process manager
- ✅ Service manager
- ✅ Screen capture & control
- ✅ WebRTC screen sharing
- ✅ Network monitoring
- ✅ System information
- ✅ Auto-reconnect
- ✅ Silent operation

## Testing

### Test Agent Locally
```bash
# Run agent in test mode
build-test.bat
cd ..\bin
dws-agent-test.exe
```

### Test Production Build
```bash
# Build production version
build-prod-release.bat

# Test manually (will run silently)
cd ..\bin
dws-agent.exe
```

Check server logs to verify connection.

## Troubleshooting

### Agent not connecting?
1. Check server is running: `https://dws-parth.daucu.com`
2. Verify firewall allows outbound WebSocket connections
3. Check Windows Defender hasn't blocked the agent
4. Run test build to see logs: `build-test.bat`

### Wrong architecture?
- Use `dws-agent-amd64.exe` for most modern systems
- Use `dws-agent-386.exe` only for 32-bit Windows
- Use `dws-agent-arm64.exe` only for ARM Windows devices

### Need logs?
Use development build:
```bash
build-test.bat
cd ..\bin
dws-agent-test.exe
```

## Distribution

1. Build production release:
   ```bash
   build-prod-release.bat
   ```

2. Package the appropriate executable:
   - `dws-agent-amd64.exe` for most users
   - `dws-agent-386.exe` for legacy systems
   - `dws-agent-arm64.exe` for ARM devices

3. Include installer if needed:
   ```bash
   cd ..\installer
   build-installer.bat
   ```

4. Distribute via:
   - Direct download
   - Windows Installer (.msi)
   - Software deployment tools
   - Group Policy

## Security Notes

⚠️ **Production builds**:
- Run silently (no console window)
- No debug logs (prevents information leakage)
- Stripped binaries (harder to reverse engineer)
- Secure WebSocket (WSS) connections

⚠️ **Recommendations**:
- Always use WSS (not WS) in production
- Keep server URL confidential
- Implement proper authentication
- Monitor agent connections
- Regular security updates

## Version Information

Build date: 2026-01-13
Go version: 1.21+
Supported OS: Windows 7 SP1 and later
