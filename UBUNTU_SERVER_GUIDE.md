# Running the Server on Ubuntu/Linux

The central server hub is platform-independent and runs on Ubuntu/Linux. However, the Windows-specific agent handlers should NOT be compiled on Linux.

## Quick Start

### On Ubuntu Server:

```bash
# Navigate to server directory
cd /home/harshaweb/dws-parth/server

# Build only the hub (not Windows-specific files)
go build -o ../bin/server_hub main_hub.go database.go

# Run the server
cd ../bin
./server_hub
```

### Or use the convenience script:

```bash
# Make it executable
chmod +x start-server-linux.sh

# Run it
./start-server-linux.sh
```

## What Gets Compiled

**✅ Compiled (Platform Independent):**
- `main_hub.go` - Central hub for routing messages
- `database.go` - MongoDB integration (optional)

**❌ NOT Compiled (Windows Only):**
- `services.go` - Windows service management
- `screen.go` - Windows screen capture
- `shell.go` - Windows shell operations  
- `control.go` - Windows mouse/keyboard control
- `filemanager.go` - Windows file operations
- `software.go` - Windows software management
- `monitor.go` - Windows system monitoring

These Windows-specific handlers run on the **agent** (Windows client), not the server!

## Server Hub Responsibilities

The server hub ONLY:
1. ✅ Accepts WebSocket connections from agents (Windows clients)
2. ✅ Accepts WebSocket connections from frontend (web dashboard)
3. ✅ Routes messages between agents and frontend
4. ✅ Maintains device registry
5. ✅ Broadcasts device status updates

## Architecture

```
┌─────────────┐                  ┌──────────────┐                  ┌──────────────┐
│   Windows   │                  │    Ubuntu    │                  │   Browser    │
│   Agent     │──────────────────│    Server    │──────────────────│   Frontend   │
│             │  WebSocket       │     Hub      │  WebSocket       │              │
│  (Client)   │  /ws/client      │              │  /ws/frontend    │  (Dashboard) │
└─────────────┘                  └──────────────┘                  └──────────────┘
     │                                   │                                │
     │  Sends commands execution         │  Routes messages              │
     │  (files, services, etc.)          │  between clients              │
     │                                   │  and frontend                 │
     └───────────────────────────────────┴───────────────────────────────┘
```

## Ports

- **8080** - WebSocket server (agents and frontend connect here)
- **27017** - MongoDB (optional, for persistence)

## Running as a Service (systemd)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/remote-admin-hub.service
```

Add this content:

```ini
[Unit]
Description=Remote Admin Central Server Hub
After=network.target

[Service]
Type=simple
User=harshaweb
WorkingDirectory=/home/harshaweb/dws-parth/bin
ExecStart=/home/harshaweb/dws-parth/bin/server_hub
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable remote-admin-hub
sudo systemctl start remote-admin-hub
sudo systemctl status remote-admin-hub
```

## Firewall

Allow port 8080:

```bash
sudo ufw allow 8080/tcp
sudo ufw reload
```

## Environment Variables

Optional MongoDB connection:

```bash
export MONGODB_URI="mongodb://localhost:27017"
export LOCAL_MODE="false"
```

## Monitoring

Check server status:

```bash
# View logs
sudo journalctl -u remote-admin-hub -f

# Check if running
sudo systemctl status remote-admin-hub

# Check listening ports
sudo netstat -tlnp | grep 8080
```

## Updating

```bash
# Stop service
sudo systemctl stop remote-admin-hub

# Rebuild
cd /home/harshaweb/dws-parth/server
go build -o ../bin/server_hub main_hub.go database.go

# Start service
sudo systemctl start remote-admin-hub
```

## Troubleshooting

### Port already in use
```bash
sudo lsof -i :8080
sudo kill -9 <PID>
```

### Build errors about Windows packages
Make sure you're only building `main_hub.go` and `database.go`, not all .go files in the directory.

**Wrong:**
```bash
go build .
go run .
```

**Correct:**
```bash
go build -o server_hub main_hub.go database.go
./server_hub
```

### Can't connect from Windows agent
1. Check firewall allows port 8080
2. Verify server is listening: `netstat -tlnp | grep 8080`
3. Test from Windows: `Test-NetConnection YOUR_SERVER_IP -Port 8080`
4. Update agent code with correct server IP

## Production Deployment

1. Use reverse proxy (nginx) for HTTPS
2. Enable firewall (only allow necessary ports)
3. Set up monitoring (Prometheus/Grafana)
4. Configure log rotation
5. Set up automatic backups (if using MongoDB)
6. Use environment variables for sensitive config

## Summary

The server is just a **message router** - it doesn't need Windows libraries. All Windows-specific operations happen on the agents (Windows clients). This design allows the server to run on any platform (Ubuntu, CentOS, Docker, etc.) while agents handle OS-specific operations.
