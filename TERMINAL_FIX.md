# Terminal Fix - PowerShell and CMD

## Issue
PowerShell and CMD terminals were not working in the frontend.

## Root Cause
The issue was in the WebSocket message handling. The terminals were not properly filtering messages by `device_id`, causing all terminals to receive messages meant for other devices.

## Message Flow
1. **Frontend → Server**: `{type: "shell_command", device_id: "xxx", data: {session_id, command, shell_type}}`
2. **Server → Agent**: Forwards the message
3. **Agent → Server**: `{type: "shell_response", device_id: "xxx", data: {success, message, data: {output, ...}}}`
4. **Server → Frontend**: Forwards the response

## Data Structure
```json
{
  "type": "shell_response",
  "device_id": "device-123",
  "data": {
    "success": true,
    "message": "Command executed",
    "data": {
      "output": "command output here",
      "exit_code": 0,
      "shell_type": "powershell",
      "working_dir": "C:\\Users\\username"
    }
  }
}
```

## Fixes Applied

### 1. professional-terminal.tsx
- Added device_id filtering in `websocket.onmessage` handler
- Now ignores messages for other devices: `if (message.device_id && message.device_id !== deviceId) return`

### 2. xterm-terminal.tsx
- Added device_id filtering in `websocket.onmessage` handler
- Added missing `session_id` field in shell command data
- Fixed: `data: { session_id: deviceId, command: command, shell_type: shellType }`

### 3. shell-terminal.tsx
- Already had proper device_id filtering
- No changes needed

## Testing
1. Open multiple device terminals
2. Execute PowerShell commands (e.g., `Get-Process`, `Get-Location`)
3. Execute CMD commands (e.g., `dir`, `cd`)
4. Switch between PowerShell and CMD
5. Verify each terminal receives only its own responses

## Files Modified
- `frontend/components/professional-terminal.tsx`
- `frontend/components/xterm-terminal.tsx`
