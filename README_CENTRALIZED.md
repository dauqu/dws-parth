# Remote Admin System - Centralized Architecture

## 🏗️ Architecture Overview

This system uses a centralized hub-and-spoke architecture:

```
┌─────────────────┐
│  Windows Agent  │──┐
│   (Client 1)    │  │
└─────────────────┘  │
                     │    ┌─────────────────┐      ┌──────────────┐
┌─────────────────┐  ├───▶│  Central Server │◀────▶│   Frontend   │
│  Windows Agent  │──┤    │     (Hub)       │      │  Dashboard   │
│   (Client 2)    │  │    └─────────────────┘      └──────────────┘
└─────────────────┘  │
                     │
┌─────────────────┐  │
│  Windows Agent  │──┘
│   (Client N)    │
└─────────────────┘
```

### Components

1. **Windows Agent** (`agent/main.go`)
   - Runs on each Windows machine to be monitored
   - Collects system metrics (CPU, RAM, disk, etc.)
   - Sends data to central server
   - Receives and executes commands from server

2. **Central Server** (`server/main_hub.go`)
   - Acts as hub for all agents and frontend connections
   - Maintains WebSocket connections from multiple agents
   - Routes commands from frontend to appropriate agent
   - Stores device data in MongoDB
   - Provides REST API for device management

3. **Frontend Dashboard** (`frontend/`)
   - Next.js web application
   - Connects only to central server
   - Displays all connected devices
   - Sends commands through server

## 🚀 Quick Start

### 1. Build the System

```bash
build_centralized.bat
```

This builds:
- `bin/server_hub.exe` - Central server
- `bin/agent.exe` - Windows agent

### 2. Start the Central Server

```bash
start_hub.bat
```

The server will start on port 8080:
- Agent WebSocket: `ws://localhost:8080/ws/client`
- Frontend WebSocket: `ws://localhost:8080/ws/frontend`
- REST API: `http://localhost:8080/api`

### 3. Start the Frontend

```bash
cd frontend
pnpm dev
```

Frontend runs on: `http://localhost:3000`

### 4. Start Windows Agents

On each Windows machine you want to monitor:

```bash
start_agent.bat
```

The agent will automatically:
- Connect to central server
- Register itself
- Start sending system metrics
- Listen for commands

## 📡 Communication Flow

### Device Registration

```
Agent                    Server                  Frontend
  │                        │                        │
  ├──device_register──────▶│                        │
  │  {device_id, info}     ├──device_connected────▶│
  │                        │  {device_info}         │
```

### System Metrics

```
Agent                    Server                  Frontend
  │                        │                        │
  ├──system_update────────▶│                        │
  │  {cpu, ram, disk...}   ├──system_update───────▶│
  │                        │  {device_id, metrics}  │
  │                        │                        │
  ├──heartbeat────────────▶│                        │
  │  {timestamp}           │                        │
```

### Command Execution

```
Frontend                 Server                  Agent
  │                        │                        │
  ├──file_operation───────▶│                        │
  │  {device_id, cmd}      ├──file_operation──────▶│
  │                        │                        │
  │                        │◀──file_response───────┤
  │                        │  {result}              │
  │◀──file_response────────┤                        │
  │  {device_id, result}   │                        │
```

## 🔧 Configuration

### Agent Configuration

Edit `agent/main.go`:

```go
const (
    SERVER_URL = "ws://your-server:8080/ws/client"
)
```

### Server Configuration

Edit `server/main_hub.go`:

```go
server := &http.Server{
    Addr:    ":8080", // Change port if needed
    Handler: handler,
}
```

### Frontend Configuration

Edit `frontend/lib/api-config.ts`:

```typescript
export const API_URL = 'http://your-server:8080'
export const WS_URL = 'ws://your-server:8080'
```

## 📋 Message Types

### Agent → Server

- `device_register` - Register new device
- `system_update` - Send system metrics
- `heartbeat` - Keep connection alive
- `*_response` - Command responses

### Server → Frontend

- `device_connected` - New device online
- `device_disconnected` - Device offline
- `system_update` - Real-time metrics
- `device_list` - All devices on connect

### Frontend → Server

- `system_info` - Request system info
- `file_operation` - File management
- `service_operation` - Service control
- `screen_capture` - Screen viewing
- `shell_command` - Execute commands

## 🗄️ Database

The server uses MongoDB to store:
- Device information
- System metrics history
- Command logs
- User sessions

Configure in `server/database.go`:

```go
MONGO_URI = "mongodb://localhost:27017"
```

## 🔒 Security Considerations

For production deployment:

1. **Use HTTPS/WSS**
   ```go
   server.ListenAndServeTLS(certFile, keyFile)
   ```

2. **Authentication**
   - Add JWT tokens
   - Verify device IDs
   - Rate limiting

3. **CORS Configuration**
   ```go
   AllowedOrigins: []string{"https://yourdomain.com"}
   ```

4. **Firewall Rules**
   - Open port 8080 for server
   - Restrict agent connections to trusted IPs

## 📊 Features

Each agent provides:
- ✅ Real-time system metrics (CPU, RAM, Disk)
- ✅ File management (browse, upload, download)
- ✅ Service control (start, stop, restart)
- ✅ Screen viewing
- ✅ Shell terminal (CMD/PowerShell)
- ✅ Software management (winget)

## 🛠️ Development

### Add New Command Handler

1. **Agent** (`agent/main.go`):
```go
func (a *Agent) HandleCommand(cmdType string, data interface{}) interface{} {
    switch cmdType {
    case "my_command":
        // Handle command
        return result
    }
}
```

2. **Server** (`server/main_hub.go`):
```go
// Routes automatically forward messages
```

3. **Frontend** (component):
```typescript
ws.send(JSON.stringify({
    type: 'my_command',
    device_id: deviceId,
    data: { /* command data */ }
}))
```

## 🐛 Troubleshooting

### Agent won't connect
- Check server is running
- Verify SERVER_URL in agent code
- Check firewall settings

### Frontend not receiving data
- Check WebSocket connection in browser console
- Verify API_URL and WS_URL in api-config.ts
- Ensure CORS is configured correctly

### Database errors
- Install and start MongoDB
- Check connection string
- Server works in LOCAL MODE without database (limited features)

## 📝 Logging

All components provide detailed logs:

- **Agent**: Device ID, connection status, commands received
- **Server**: Client connections, message routing, errors
- **Frontend**: WebSocket status, API calls, responses

Monitor server console for real-time activity.

## 🚀 Deployment

### Windows Service (Agent)

Use NSSM to run agent as service:

```bash
nssm install RemoteAdminAgent "C:\path\to\agent.exe"
nssm start RemoteAdminAgent
```

### Linux Server (Central Hub)

```bash
# Build for Linux
GOOS=linux GOARCH=amd64 go build -o server_hub

# Run with systemd
sudo systemctl start remote-admin-hub
```

### Docker

See `docker-compose.yml` for containerized deployment.

## 📚 API Reference

### REST Endpoints

- `GET /api/devices` - List all devices
- `GET /api/devices/{id}` - Get device details
- `POST /api/devices/{id}/command` - Send command

### WebSocket Endpoints

- `/ws/client` - For agents
- `/ws/frontend` - For dashboard

## 🎯 Roadmap

- [ ] Multi-user authentication
- [ ] Role-based access control
- [ ] Command history and audit logs
- [ ] Alert notifications
- [ ] Mobile app
- [ ] Plugin system

## 📄 License

MIT License - See LICENSE file

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md

---

**Built with ❤️ using Go, Next.js, and WebSockets**
