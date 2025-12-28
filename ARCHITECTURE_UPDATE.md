# Centralized Architecture

## New Architecture Flow

```
┌─────────────────┐
│  Windows Client │ (Remote Machine)
│   (Agent/Client)│
└────────┬────────┘
         │ WebSocket
         │ Sends: System Info, File Data, Screen Captures, etc.
         ▼
┌─────────────────┐
│ Central Server  │ (Your Server)
│  (Hub/Broker)   │
└────────┬────────┘
         │ WebSocket/REST API
         │ Provides: Device Data, Control Commands, etc.
         ▼
┌─────────────────┐
│    Frontend     │ (Web Dashboard)
│  (React/Next.js)│
└─────────────────┘
```

## Components

### 1. Windows Client (Agent)
- Runs on each remote Windows machine
- Collects system information
- Executes commands received from server
- Sends data to central server
- File: `client/main.go`

### 2. Central Server
- Acts as hub/broker
- Stores device data in MongoDB
- Routes commands to appropriate clients
- Serves frontend with device data
- File: `server/main.go`

### 3. Frontend Dashboard
- Connects only to central server
- Displays all registered devices
- Sends control commands via server
- File: `frontend/app/dashboard/*`

## Communication Protocol

### Client → Server
```json
{
  "type": "device_register|system_update|heartbeat|command_response",
  "device_id": "unique-device-id",
  "data": { ... }
}
```

### Frontend → Server → Client
```json
{
  "type": "command",
  "device_id": "target-device-id",
  "command": "file_operation|shell_command|screen_capture|etc",
  "data": { ... }
}
```

### Server → Frontend
```json
{
  "type": "device_list|device_data|command_result",
  "data": { ... }
}
```

## Benefits
- ✅ Centralized device management
- ✅ Multiple devices supported
- ✅ Better security (no direct client exposure)
- ✅ Easier scaling
- ✅ Persistent device data in database
