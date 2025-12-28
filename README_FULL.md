# Remote Device Management System

A comprehensive remote administration tool for Windows devices with MongoDB integration, real-time monitoring, file management, service control, and screen sharing.

## 🚀 Features

### Multi-Device Management
- **Device Dashboard**: Manage multiple Windows devices from a central interface
- **Device Registration**: Automatic device registration with MongoDB
- **Real-time Status**: Track device connection status, uptime, and last seen
- **Device Profiles**: Store device information (hostname, IP, OS, user)

### System Monitoring
- **Real-time Metrics**: CPU, RAM, and Disk usage with auto-refresh
- **System Information**: OS version, hostname, network details
- **Storage Volumes**: Monitor all drives with usage percentages

### File Management
- **Explorer-like Interface**: Navigate folders with double-click
- **Download Files**: Click files to download them locally
- **File Operations**: View, delete, create, move, copy files
- **Breadcrumb Navigation**: Easy path navigation with clickable segments

### Remote Control
- **Screen Streaming**: Real-time screen capture at 20 FPS
- **Mouse Control**: Full mouse control (click, drag, move)
- **Keyboard Control**: Type and send keystrokes remotely
- **Enable/Disable Control**: Toggle remote control on/off

### Service Management
- **View Services**: List all Windows services with status
- **Start/Stop/Restart**: Control service execution
- **Enable/Disable**: Modify service startup configuration
- **Admin Detection**: Clear UI for privilege requirements

### Remote Shell
- **PowerShell Support**: Execute PowerShell commands remotely
- **CMD Support**: Switch between PowerShell and Command Prompt
- **Shell History**: View command output and working directory
- **Export Logs**: Download shell session history

## 📋 Prerequisites

### Backend
- Go 1.23+ installed
- Windows OS (for service management and screen control)
- MongoDB Atlas account (or local MongoDB)

### Frontend
- Node.js 18+ installed
- pnpm (or npm/yarn)

## 🛠️ Installation

### 1. Clone and Setup Backend

```powershell
cd "c:\Users\Harsh singh\Documents\go\dws-parth"

# Install Go dependencies
go mod tidy

# Build server
go build -o bin/server.exe ./server
```

### 2. Setup Frontend

```powershell
cd frontend

# Install dependencies
pnpm install

# Build for production
pnpm build

# Or run development server
pnpm dev
```

## 🔧 Configuration

### MongoDB Connection

The backend is pre-configured with the MongoDB connection string:
```
mongodb+srv://dwsparth:7388139606@cluster0.d0wsypq.mongodb.net/?appName=Cluster0
```

To change it, edit `server/database.go`:
```go
const mongoURI = "your-mongodb-connection-string"
```

### Frontend API URL

The frontend connects to the backend via environment variables. Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

For production, update these to your server's public URL.

## ▶️ Running the Application

### Start Backend Server

```powershell
# Normal mode
cd bin
.\server.exe

# As Administrator (required for service management)
# Right-click server.exe > Run as Administrator
```

The server will start on **http://localhost:8080**

### Start Frontend

```powershell
cd frontend

# Development
pnpm dev

# Production
pnpm build
pnpm start
```

The frontend will be available at **http://localhost:3000**

## 🌐 API Endpoints

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/devices` | GET | List all devices |
| `/api/devices` | POST | Register new device |
| `/api/devices/{id}` | GET | Get device details |
| `/api/devices/{id}` | PUT | Update device status |
| `/api/devices/{id}` | DELETE | Delete device |
| `/api/system` | GET | Get system information |
| `/api/files?path=C:\` | GET | List files in path |
| `/api/services` | GET | List Windows services |
| `/status` | GET | Server status |

### WebSocket Endpoints

| Endpoint | Description |
|----------|-------------|
| `/ws` | General commands (file ops, services, control) |
| `/ws/system` | Real-time system metrics stream |
| `/ws/screen` | Screen capture stream |

### WebSocket Message Types

**Outgoing (Client → Server):**
- `system_info`: Request system information
- `file_operation`: File operations (list, read, create, delete, move, copy)
- `service_operation`: Service control (list, start, stop, enable, disable)
- `screen_capture`: Request single screen capture
- `mouse_control`: Send mouse events (click, move, drag)
- `keyboard_control`: Send keyboard events (keypress, keydown, keyup)
- `shell_command`: Execute shell command
- `switch_shell`: Switch between PowerShell and CMD

**Incoming (Server → Client):**
- `system_info`: System information response
- `file_response`: File operation result
- `service_response`: Service operation result
- `screen_capture`: Screen image (base64 JPEG)
- `control_response`: Control command acknowledgment
- `shell_response`: Shell command output

## 📊 Database Schema

### Devices Collection
```javascript
{
  _id: ObjectId,
  user_id: String,
  name: String,
  hostname: String,
  ip_address: String,
  os_version: String,
  status: "online" | "offline" | "maintenance",
  connection_status: "connected" | "disconnected" | "error",
  last_seen: DateTime,
  windows_username: String,
  wallpaper_url: String,
  created_at: DateTime,
  updated_at: DateTime
}
```

### Sessions Collection
```javascript
{
  _id: ObjectId,
  device_id: ObjectId,
  user_id: String,
  started_at: DateTime,
  ended_at: DateTime,
  active: Boolean
}
```

## 🎨 Frontend Structure

The Next.js frontend includes:

```
frontend/
├── app/
│   ├── page.tsx              # Home/redirect
│   ├── login/                # Authentication
│   └── dashboard/            # Main dashboard
│       ├── page.tsx          # Device list
│       └── [deviceId]/       # Device details
│           ├── page.tsx      # Overview tab
│           ├── files/        # File manager
│           ├── screen/       # Screen viewer
│           ├── shell/        # Remote shell
│           └── services/     # Service manager
├── lib/
│   ├── api-config.ts         # API endpoints
│   ├── api-client.ts         # API functions
│   └── types.ts              # TypeScript types
└── components/               # Reusable components
```

## 🔐 Security Considerations

⚠️ **Important Security Notes:**

1. **MongoDB Credentials**: The connection string contains credentials. In production:
   - Use environment variables
   - Implement IP whitelisting in MongoDB Atlas
   - Use dedicated user accounts with limited permissions

2. **CORS**: Currently allows all origins (`*`). Restrict this in production:
   ```go
   AllowedOrigins: []string{"https://yourdomain.com"},
   ```

3. **Authentication**: Add authentication before deploying:
   - JWT tokens for API access
   - User sessions for frontend
   - Device authentication tokens

4. **Admin Privileges**: Service management requires admin rights. Run server as administrator or implement UAC elevation.

5. **Network Security**:
   - Use HTTPS/WSS in production
   - Implement rate limiting
   - Add request validation

## 🐛 Troubleshooting

### Server won't start
- Check if port 8080 is already in use
- Verify MongoDB connection string is correct
- Ensure Go dependencies are installed: `go mod tidy`

### Services show "Access is denied"
- Run server as Administrator
- Right-click `server.exe` → Run as Administrator

### Frontend can't connect
- Verify server is running on port 8080
- Check `.env.local` has correct API URLs
- Ensure CORS is enabled in backend

### Screen streaming is slow
- Adjust JPEG quality in `server/screen.go`
- Reduce capture FPS (increase interval)
- Check network bandwidth

## 📝 Development

### Add New API Endpoint

1. Add handler in `server/api.go`:
```go
func HandleAPINewFeature(w http.ResponseWriter, r *http.Request) {
    // Implementation
}
```

2. Register route in `SetupRESTAPI()`:
```go
router.HandleFunc("/api/feature", HandleAPINewFeature).Methods("GET")
```

3. Add frontend function in `frontend/lib/api-client.ts`:
```typescript
export async function fetchFeature() {
  const response = await fetch(API_ENDPOINTS.feature)
  return response.json()
}
```

### Add WebSocket Message Type

1. Add case in `server/main.go` → `handleMessage()`:
```go
case "new_type":
    // Handle message
    return Response{...}
```

2. Send from frontend:
```typescript
sendWebSocketMessage(ws, 'new_type', { data })
```

## 📦 Building for Production

### Backend Executable
```powershell
go build -ldflags="-s -w" -o bin/server.exe ./server
```

### Frontend Static Export
```powershell
cd frontend
pnpm build
# Output in frontend/.next/
```

## 🤝 Contributing

This is a private project but improvements are welcome:
- Bug fixes
- Performance optimizations
- Security enhancements
- Documentation improvements

## 📄 License

Private/Proprietary - All rights reserved

## 👤 Author

**Parth** (dwsparth)
- MongoDB: dwsparth
- Database: device_management

---

**Built with:** Go, Next.js, MongoDB, WebSockets, TypeScript, Tailwind CSS

