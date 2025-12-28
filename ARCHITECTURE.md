# System Architecture

## Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Remote Admin Tool                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐                    ┌──────────────────────┐
│   Admin Machine      │                    │   Target Machine     │
│                      │                    │                      │
│  ┌────────────────┐  │   WebSocket/HTTP   │  ┌────────────────┐  │
│  │  Web Browser   │  │◄──────────────────►│  │  Server.exe    │  │
│  │                │  │                    │  │                │  │
│  │ webclient.html │  │   Port 8080        │  │  Go WebSocket  │  │
│  │                │  │                    │  │     Server     │  │
│  │  - System Info │  │                    │  └───────┬────────┘  │
│  │  - Files       │  │                    │          │           │
│  │  - Services    │  │                    │          │           │
│  │  - Screen      │  │                    │          │           │
│  └────────────────┘  │                    │          │           │
└──────────────────────┘                    │          ▼           │
                                            │  ┌───────────────┐  │
                                            │  │  Windows APIs │  │
                                            │  ├───────────────┤  │
                                            │  │ • gopsutil    │  │
                                            │  │ • screenshot  │  │
                                            │  │ • svc/mgr     │  │
                                            │  │ • file I/O    │  │
                                            │  └───────┬───────┘  │
                                            │          │           │
                                            │          ▼           │
                                            │  ┌───────────────┐  │
                                            │  │ Windows OS    │  │
                                            │  ├───────────────┤  │
                                            │  │ CPU/RAM/Disk  │  │
                                            │  │ Services      │  │
                                            │  │ File System   │  │
                                            │  │ Display       │  │
                                            │  └───────────────┘  │
                                            └──────────────────────┘
```

## Data Flow

### 1. System Monitoring
```
Client                Server              System
  │                     │                   │
  ├──system_info───────►│                   │
  │                     ├──gopsutil────────►│
  │                     │◄──CPU/RAM/Disk───┤
  │◄──JSON response────┤                   │
  │                     │                   │
```

### 2. File Operations
```
Client                Server              File System
  │                     │                   │
  ├──file_operation────►│                   │
  │  (list, C:\)        │                   │
  │                     ├──ReadDir()───────►│
  │                     │◄──File List──────┤
  │◄──JSON file list───┤                   │
  │                     │                   │
```

### 3. Service Management
```
Client                Server              Windows
  │                     │                   │
  ├──service_operation─►│                   │
  │  (start, serviceName)                   │
  │                     ├──mgr.Connect()───►│
  │                     ├──OpenService()───►│
  │                     ├──Start()─────────►│
  │                     │◄──Success────────┤
  │◄──JSON response────┤                   │
  │                     │                   │
```

### 4. Screen Capture
```
Client                Server              Display
  │                     │                   │
  ├──screen_capture────►│                   │
  │                     ├──screenshot.Capture()
  │                     │◄──Image Buffer───┤
  │                     ├──JPEG Encode     │
  │                     ├──Base64 Encode   │
  │◄──Base64 image─────┤                   │
  │  (displays)         │                   │
```

## WebSocket Endpoints

### Main Communication Channel
```
ws://[server]:8080/ws
│
├── system_info → GetSystemInfo()
├── file_operation → HandleFileOperation()
├── service_operation → HandleServiceOperation()
└── screen_capture → CaptureScreen()
```

### Streaming Channels
```
ws://[server]:8080/ws/system
│
└── Auto-push every 2 seconds
    └── System metrics

ws://[server]:8080/ws/screen
│
└── Auto-push ~10 FPS
    └── Screen frames
```

## File Structure

```
dws-parth/
│
├── server/                    # Backend Go code
│   ├── main.go               # WebSocket server, HTTP handlers
│   ├── monitor.go            # System info collection
│   ├── filemanager.go        # File operations
│   ├── services.go           # Windows service control
│   └── screen.go             # Screen capture
│
├── client/                    # Frontend
│   ├── main.go               # Go GUI (optional)
│   └── webclient.html        # Primary web interface
│
├── bin/                       # Build output
│   ├── server.exe            # Compiled server
│   ├── webclient.html        # Web client
│   ├── run_server.bat        # Helper script
│   └── open_client.bat       # Helper script
│
├── go.mod                     # Go dependencies
├── build.bat                  # Build script
├── README.md                  # Full documentation
├── QUICKSTART.md             # Quick start guide
└── PROJECT_SUMMARY.md        # This file
```

## Message Protocol

### Request Format
```javascript
{
  "type": "message_type",    // Action identifier
  "data": {                  // Action-specific payload
    // ... parameters
  }
}
```

### Response Format
```javascript
{
  "type": "response_type",   // Response identifier
  "data": {                  // Response payload
    "success": true/false,
    "message": "...",
    "data": { /* actual data */ }
  }
}
```

## Technology Stack

### Backend
```
┌─────────────────────────────────────┐
│          Go 1.21+ Runtime           │
├─────────────────────────────────────┤
│ Standard Library                    │
│ • net/http                          │
│ • encoding/json                     │
│ • io/ioutil                         │
├─────────────────────────────────────┤
│ External Packages                   │
│ • gorilla/websocket v1.5.1          │
│ • shirou/gopsutil/v3 v3.23.12       │
│ • kbinani/screenshot v0.0.0         │
│ • golang.org/x/sys/windows          │
└─────────────────────────────────────┘
```

### Frontend
```
┌─────────────────────────────────────┐
│      Modern Web Browser             │
├─────────────────────────────────────┤
│ HTML5                               │
│ • Semantic markup                   │
│ • Canvas for images                 │
├─────────────────────────────────────┤
│ CSS3                                │
│ • Flexbox layout                    │
│ • Grid layout                       │
│ • Custom styling                    │
├─────────────────────────────────────┤
│ JavaScript (ES6+)                   │
│ • WebSocket API                     │
│ • Fetch API                         │
│ • DOM manipulation                  │
│ • Event handling                    │
└─────────────────────────────────────┘
```

## Security Architecture

### Current (Basic)
```
Client ◄──────────► Server
     Plain HTTP/WS
     No Auth
     No Encryption
```

### Recommended (Production)
```
Client ◄────TLS────► Server ◄──ACL──► Windows
       │             │                    ▲
       │             ├──Auth Token        │
       │             ├──Rate Limit        │
       │             └──Audit Log ────────┘
       │
       └──JWT/Session
```

## Performance Characteristics

### Latency
- WebSocket handshake: ~50ms
- System info query: ~100ms
- File list (100 files): ~50ms
- Service list: ~1-2s
- Screen capture: ~100ms
- Message round-trip: <50ms LAN

### Throughput
- System updates: 0.5 Hz (every 2s)
- Screen stream: ~10 Hz (10 FPS)
- File operations: Limited by disk I/O
- Service ops: Limited by Windows API

### Resource Usage
- Server memory: 10-20 MB idle
- Server CPU: <1% idle, 5-10% active
- Network: ~500 KB/s during screen streaming
- Client memory: ~50-100 MB (browser)

## Deployment Scenarios

### Scenario 1: Local Testing
```
Same Machine
├── Server: localhost:8080
└── Client: localhost:8080
    └── Testing and development
```

### Scenario 2: Home Network
```
Home LAN (192.168.x.x)
├── Server: Desktop (192.168.1.100:8080)
└── Client: Laptop (192.168.1.101)
    └── Remote administration at home
```

### Scenario 3: Office Network
```
Corporate LAN
├── Server: Multiple workstations
│   ├── PC1: 192.168.10.101:8080
│   ├── PC2: 192.168.10.102:8080
│   └── PC3: 192.168.10.103:8080
└── Client: Admin workstation
    └── IT department monitoring
```

## Error Handling

### Connection Errors
```
Client attempts connection
    │
    ├─► Success → Connected state
    │
    └─► Failure → Error message
        ├── Network unreachable
        ├── Connection refused (server not running)
        ├── Timeout (firewall)
        └── Protocol mismatch
```

### Operation Errors
```
Client sends command
    │
Server processes
    │
    ├─► Success → Return data
    │
    └─► Failure → Error response
        ├── Permission denied
        ├── Resource not found
        ├── Invalid parameters
        └── System error
```

---

**Architecture Version**: 1.0  
**Last Updated**: December 27, 2025  
**Platform**: Windows  
**Protocol**: WebSocket over HTTP
