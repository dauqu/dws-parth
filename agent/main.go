package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

// Server URL - can be overridden at build time using:
// go build -ldflags="-X main.SERVER_URL=wss://dws-parth.daucu.com/ws/client"
var SERVER_URL = "wss://dws-parth.daucu.com/ws/client"

// Production mode - set to "true" at build time to disable console logging
// go build -ldflags="-X main.PRODUCTION=true -H windowsgui"
var PRODUCTION = "false"

type ClientMessage struct {
	Type     string      `json:"type"`
	DeviceID string      `json:"device_id"`
	Data     interface{} `json:"data"`
}

type SystemInfo struct {
	CPUUsage    float64 `json:"cpu_usage"`
	CPUCores    int     `json:"cpu_cores"`
	RAMTotal    uint64  `json:"ram_total"`
	RAMUsed     uint64  `json:"ram_used"`
	RAMPercent  float64 `json:"ram_percent"`
	DiskTotal   uint64  `json:"disk_total"`
	DiskUsed    uint64  `json:"disk_used"`
	DiskPercent float64 `json:"disk_percent"`
	OS          string  `json:"os"`
	Platform    string  `json:"platform"`
	Hostname    string  `json:"hostname"`
	Username    string  `json:"username"`
	IPAddress   string  `json:"ip_address"`
	Uptime      uint64  `json:"uptime"`
}

type DeviceInfo struct {
	DeviceID  string `json:"device_id"`
	Hostname  string `json:"hostname"`
	OS        string `json:"os"`
	Platform  string `json:"platform"`
	Username  string `json:"username"`
	IPAddress string `json:"ip_address"`
	Wallpaper string `json:"wallpaper_url"`
	Label     string `json:"label"`      // Device label stored locally
	GroupName string `json:"group_name"` // Device group stored locally
}

type LocalConfig struct {
	Label     string `json:"label"`
	GroupName string `json:"group_name"`
}

type Agent struct {
	conn        *websocket.Conn
	deviceID    string
	writeMux    sync.Mutex // Protect concurrent writes to WebSocket
	configPath  string
	localConfig LocalConfig
}

func NewAgent() *Agent {
	hostname, _ := os.Hostname()

	// Get config directory path
	configDir, _ := os.UserConfigDir()
	agentConfigDir := filepath.Join(configDir, "dws-agent")
	os.MkdirAll(agentConfigDir, 0755)

	agent := &Agent{
		deviceID:   hostname, // Use hostname as device ID
		configPath: filepath.Join(agentConfigDir, "config.json"),
	}

	// Load local config (label)
	agent.loadLocalConfig()

	return agent
}

func (a *Agent) loadLocalConfig() {
	data, err := ioutil.ReadFile(a.configPath)
	if err != nil {
		// If file doesn't exist, create with empty values
		a.localConfig = LocalConfig{Label: "", GroupName: ""}
		a.saveLocalConfig()
		return
	}

	err = json.Unmarshal(data, &a.localConfig)
	if err != nil {
		log.Printf("⚠️  Failed to parse config file: %v", err)
		a.localConfig = LocalConfig{Label: "", GroupName: ""}
	}
	log.Printf("📋 Loaded local config: label=%s, group=%s", a.localConfig.Label, a.localConfig.GroupName)
}

func (a *Agent) saveLocalConfig() error {
	data, err := json.MarshalIndent(a.localConfig, "", "  ")
	if err != nil {
		return err
	}

	err = ioutil.WriteFile(a.configPath, data, 0644)
	if err != nil {
		return err
	}

	log.Printf("💾 Saved local config: label=%s, group=%s", a.localConfig.Label, a.localConfig.GroupName)
	return nil
}

func (a *Agent) updateLabel(newLabel string) error {
	a.localConfig.Label = newLabel
	return a.saveLocalConfig()
}

func (a *Agent) updateGroupName(newGroup string) error {
	a.localConfig.GroupName = newGroup
	return a.saveLocalConfig()
}

func (a *Agent) Connect() error {
	conn, _, err := websocket.DefaultDialer.Dial(SERVER_URL, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to server: %v", err)
	}
	a.conn = conn
	log.Println("✅ Connected to central server")
	return nil
}

// ConnectWithRetry keeps trying to connect to the server until successful
func (a *Agent) ConnectWithRetry() {
	retryInterval := 5 * time.Second
	maxRetryInterval := 60 * time.Second

	for {
		err := a.Connect()
		if err == nil {
			return
		}

		log.Printf("🔄 Connection failed, retrying in %v...", retryInterval)
		time.Sleep(retryInterval)

		// Increase retry interval (exponential backoff) up to max
		retryInterval = retryInterval * 2
		if retryInterval > maxRetryInterval {
			retryInterval = maxRetryInterval
		}
	}
}

func (a *Agent) RegisterDevice() error {
	hostInfo, _ := host.Info()
	username := os.Getenv("USERNAME")
	if username == "" {
		username = os.Getenv("USER")
	}

	deviceInfo := DeviceInfo{
		DeviceID:  a.deviceID,
		Hostname:  hostInfo.Hostname,
		OS:        runtime.GOOS,
		Platform:  hostInfo.Platform + " " + hostInfo.PlatformVersion,
		Username:  username,
		IPAddress: getLocalIP(),
		Wallpaper: getWallpaperPath(),
		Label:     a.localConfig.Label,     // Include local label
		GroupName: a.localConfig.GroupName, // Include local group
	}

	msg := ClientMessage{
		Type:     "device_register",
		DeviceID: a.deviceID,
		Data:     deviceInfo,
	}

	a.writeMux.Lock()
	err := a.conn.WriteJSON(msg)
	a.writeMux.Unlock()
	if err != nil {
		return fmt.Errorf("failed to register device: %v", err)
	}

	log.Println("📝 Device registered with server")
	return nil
}

func (a *Agent) SendSystemInfo() error {
	info := &SystemInfo{
		CPUCores: runtime.NumCPU(),
		OS:       runtime.GOOS,
	}

	// CPU Usage
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuPercent) > 0 {
		info.CPUUsage = cpuPercent[0]
	}

	// RAM Info
	vmem, err := mem.VirtualMemory()
	if err == nil {
		info.RAMTotal = vmem.Total
		info.RAMUsed = vmem.Used
		info.RAMPercent = vmem.UsedPercent
	}

	// Disk Info (C: drive on Windows)
	diskPath := "/"
	if runtime.GOOS == "windows" {
		diskPath = "C:\\"
	}
	diskStat, err := disk.Usage(diskPath)
	if err == nil {
		info.DiskTotal = diskStat.Total
		info.DiskUsed = diskStat.Used
		info.DiskPercent = diskStat.UsedPercent
	}

	// Host Info
	hostInfo, err := host.Info()
	if err == nil {
		info.Hostname = hostInfo.Hostname
		info.Uptime = hostInfo.Uptime
		info.Platform = hostInfo.Platform + " " + hostInfo.PlatformVersion
	}

	// Username
	if username := os.Getenv("USERNAME"); username != "" {
		info.Username = username
	} else if username := os.Getenv("USER"); username != "" {
		info.Username = username
	}

	// IP Address
	info.IPAddress = getLocalIP()

	msg := ClientMessage{
		Type:     "system_update",
		DeviceID: a.deviceID,
		Data:     info,
	}

	a.writeMux.Lock()
	defer a.writeMux.Unlock()
	return a.conn.WriteJSON(msg)
}

func (a *Agent) SendHeartbeat() error {
	msg := ClientMessage{
		Type:     "heartbeat",
		DeviceID: a.deviceID,
		Data: map[string]interface{}{
			"timestamp": time.Now().Unix(),
			"status":    "online",
		},
	}

	a.writeMux.Lock()
	defer a.writeMux.Unlock()
	return a.conn.WriteJSON(msg)
}

func (a *Agent) ListenForCommands() {
	for {
		var msg map[string]interface{}
		err := a.conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("🔄 Connection lost, reconnecting...")
			return // Return to trigger reconnection in Run()
		}

		// Handle commands from server
		msgType, ok := msg["type"].(string)
		if !ok {
			continue
		}

		// If type is "command", extract the actual command from "command" field
		cmdType := msgType
		if msgType == "command" {
			if command, ok := msg["command"].(string); ok {
				cmdType = command
			}
		}

		log.Printf("📩 Received command: %s", cmdType)

		// Process command and send response
		response := a.HandleCommand(cmdType, msg["data"])
		if response != nil {
			// Map command types to response types expected by frontend
			responseType := cmdType + "_response"
			switch cmdType {
			case "file_operation":
				responseType = "file_response"
			case "file_download":
				responseType = "file_download_response"
			case "file_upload":
				responseType = "file_upload_response"
			case "file_read":
				responseType = "file_read_response"
			case "file_write":
				responseType = "file_write_response"
			case "service_operation":
				responseType = "service_response"
			case "software_operation":
				responseType = "software_response"
			case "task_manager":
				responseType = "task_manager_response"
			case "shell_command":
				responseType = "shell_response"
			case "switch_shell":
				responseType = "switch_shell_response"
			case "screen_capture":
				responseType = "screen_capture"
			case "voice_capture":
				responseType = "voice_data"
			case "webrtc_offer", "webrtc_ice", "webrtc_signal":
				// WebRTC messages - don't send automatic response, handled by handler directly
				responseType = ""
			}

			// Only send response if responseType is set
			if responseType != "" {
				responseMsg := ClientMessage{
					Type:     responseType,
					DeviceID: a.deviceID,
					Data:     response,
				}
				a.writeMux.Lock()
				a.conn.WriteJSON(responseMsg)
				a.writeMux.Unlock()
			}
		}
	}
}

func (a *Agent) HandleCommand(cmdType string, data interface{}) interface{} {
	log.Printf("🔧 Handling command: %s", cmdType)

	// Convert data to JSON for handlers
	dataJSON, err := json.Marshal(data)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": fmt.Sprintf("Failed to parse command data: %v", err),
		}
	}

	switch cmdType {
	case "update_label":
		// Handle label update command
		var labelData map[string]interface{}
		json.Unmarshal(dataJSON, &labelData)
		if label, ok := labelData["label"].(string); ok {
			err := a.updateLabel(label)
			if err != nil {
				return map[string]interface{}{
					"success": false,
					"message": fmt.Sprintf("Failed to update label: %v", err),
				}
			}
			return map[string]interface{}{
				"success": true,
				"message": "Label updated successfully",
				"label":   label,
			}
		}
		return map[string]interface{}{
			"success": false,
			"message": "Invalid label data",
		}

	case "update_group":
		// Handle group update command
		var groupData map[string]interface{}
		json.Unmarshal(dataJSON, &groupData)
		if groupName, ok := groupData["group_name"].(string); ok {
			err := a.updateGroupName(groupName)
			if err != nil {
				return map[string]interface{}{
					"success": false,
					"message": fmt.Sprintf("Failed to update group: %v", err),
				}
			}
			log.Printf("✅ Group updated successfully: %s", groupName)

			return map[string]interface{}{
				"success":    true,
				"message":    "Group updated successfully",
				"group_name": groupName,
			}
		}
		return map[string]interface{}{
			"success": false,
			"message": "Invalid group data",
		}

	case "file_operation":
		response, err := HandleFileOperationJSON(dataJSON)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		var result interface{}
		json.Unmarshal(response, &result)
		return result

	case "file_download":
		// Handle file download request
		var downloadData map[string]interface{}
		json.Unmarshal(dataJSON, &downloadData)
		path, _ := downloadData["path"].(string)
		filename, _ := downloadData["filename"].(string)

		op := FileOperation{
			Action:   "download",
			Path:     path,
			Filename: filename,
		}
		response := HandleFileOperation(op)
		return response

	case "file_upload":
		// Handle file upload request
		var uploadData map[string]interface{}
		json.Unmarshal(dataJSON, &uploadData)
		path, _ := uploadData["path"].(string)
		filename, _ := uploadData["filename"].(string)
		content, _ := uploadData["content"].(string)

		op := FileOperation{
			Action:   "upload",
			Path:     path,
			Filename: filename,
			Content:  content,
		}
		response := HandleFileOperation(op)
		return response

	case "file_read":
		// Handle file read request (for viewing/editing)
		var readData map[string]interface{}
		json.Unmarshal(dataJSON, &readData)
		path, _ := readData["path"].(string)

		content, err := os.ReadFile(path)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": fmt.Sprintf("Failed to read file: %v", err),
			}
		}

		return map[string]interface{}{
			"success":  true,
			"data":     string(content),
			"path":     filepath.Dir(path),
			"filename": filepath.Base(path),
		}

	case "file_write":
		// Handle file write request (for saving edited files)
		var writeData map[string]interface{}
		json.Unmarshal(dataJSON, &writeData)
		path, _ := writeData["path"].(string)
		content, _ := writeData["content"].(string)

		err := os.WriteFile(path, []byte(content), 0644)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": fmt.Sprintf("Failed to write file: %v", err),
			}
		}

		return map[string]interface{}{
			"success":  true,
			"message":  "File saved successfully",
			"path":     filepath.Dir(path),
			"filename": filepath.Base(path),
		}

	case "service_operation":
		response, err := HandleServiceOperationJSON(dataJSON)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		var result interface{}
		json.Unmarshal(response, &result)
		return result

	case "software_operation":
		response, err := HandleSoftwareOperationJSON(dataJSON)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		var result interface{}
		json.Unmarshal(response, &result)
		return result

	case "task_manager":
		response := HandleTaskManagerAction(dataJSON)
		return map[string]interface{}{
			"success":   response.Success,
			"message":   response.Message,
			"processes": response.Processes,
		}

	case "screen_capture":
		// Parse screen capture options
		var captureData map[string]interface{}
		json.Unmarshal(dataJSON, &captureData)

		options := ScreenCaptureOptions{
			Quality:      60,   // Default quality
			ShowCursor:   true, // Default to showing cursor
			AdaptiveMode: true, // Enable adaptive quality by default
		}

		if q, ok := captureData["quality"].(float64); ok {
			options.Quality = int(q)
		}
		if sc, ok := captureData["show_cursor"].(bool); ok {
			options.ShowCursor = sc
		}
		if am, ok := captureData["adaptive_mode"].(bool); ok {
			options.AdaptiveMode = am
		}

		capture, err := CaptureScreenWithOptions(options)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		return map[string]interface{}{
			"success":        true,
			"image":          capture.Image,
			"width":          capture.Width,
			"height":         capture.Height,
			"cursor_x":       capture.CursorX,
			"cursor_y":       capture.CursorY,
			"network_status": capture.NetworkStatus,
		}

	case "shell_command":
		response := HandleShellCommand(dataJSON)
		return map[string]interface{}{
			"success": response.Success,
			"message": response.Message,
			"data":    response.Data,
		}

	case "switch_shell":
		response := HandleSwitchShell(dataJSON)
		return map[string]interface{}{
			"success": response.Success,
			"message": response.Message,
			"data":    response.Data,
		}

	case "mouse_control":
		var ctrl MouseControl
		if err := json.Unmarshal(dataJSON, &ctrl); err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		err := HandleMouseControl(ctrl)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		return map[string]interface{}{
			"success": true,
			"message": "Mouse control executed",
		}

	case "system_restart":
		// Execute system restart with force flag
		log.Println("⚠️ System restart requested")
		var restartData map[string]interface{}
		json.Unmarshal(dataJSON, &restartData)
		force := false
		if f, ok := restartData["force"].(bool); ok {
			force = f
		}

		go func() {
			time.Sleep(1 * time.Second) // Give time to send response
			var cmd *exec.Cmd
			if runtime.GOOS == "windows" {
				if force {
					cmd = exec.Command("shutdown", "/r", "/f", "/t", "0")
				} else {
					cmd = exec.Command("shutdown", "/r", "/t", "0")
				}
			} else {
				cmd = exec.Command("sudo", "reboot")
			}
			cmd.Run()
		}()

		return map[string]interface{}{
			"success": true,
			"message": "System restart initiated",
		}

	case "system_shutdown":
		// Execute system shutdown with force flag
		log.Println("⚠️ System shutdown requested")
		var shutdownData map[string]interface{}
		json.Unmarshal(dataJSON, &shutdownData)
		force := false
		if f, ok := shutdownData["force"].(bool); ok {
			force = f
		}

		go func() {
			time.Sleep(1 * time.Second) // Give time to send response
			var cmd *exec.Cmd
			if runtime.GOOS == "windows" {
				if force {
					cmd = exec.Command("shutdown", "/s", "/f", "/t", "0")
				} else {
					cmd = exec.Command("shutdown", "/s", "/t", "0")
				}
			} else {
				cmd = exec.Command("sudo", "shutdown", "-h", "now")
			}
			cmd.Run()
		}()

		return map[string]interface{}{
			"success": true,
			"message": "System shutdown initiated",
		}

	case "keyboard_control":
		var ctrl KeyboardControl
		if err := json.Unmarshal(dataJSON, &ctrl); err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		err := HandleKeyboardControl(ctrl)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		return map[string]interface{}{
			"success": true,
			"message": "Keyboard control executed",
		}

	case "window_control":
		var ctrl WindowControl
		if err := json.Unmarshal(dataJSON, &ctrl); err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		err := HandleWindowControl(ctrl)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": err.Error(),
			}
		}
		return map[string]interface{}{
			"success": true,
			"message": "Window control executed",
		}

	case "voice_capture":
		response := HandleVoiceControl(dataJSON)
		return response

	case "webrtc_signal", "webrtc_offer":
		// Handle WebRTC signal from frontend (frontend uses webrtc_signal with nested type)
		log.Printf("📡 Received WebRTC signal/offer")
		var signalData map[string]interface{}
		json.Unmarshal(dataJSON, &signalData)

		// Check for nested type (frontend sends: data.type = "offer", data.sdp = "...")
		signalType, _ := signalData["type"].(string)

		// Get SDP from the data
		sdpStr, ok := signalData["sdp"].(string)
		if (!ok || sdpStr == "") && signalType == "offer" {
			// SDP might not be present, that's ok for now
			log.Printf("⚠️ No SDP in WebRTC signal, signalType=%s", signalType)
			return nil
		}

		// Only process offers
		if signalType != "" && signalType != "offer" {
			log.Printf("📡 WebRTC signal type: %s (not an offer, skipping)", signalType)
			return nil
		}

		if sdpStr == "" {
			log.Printf("⚠️ No SDP in WebRTC offer")
			return nil
		}

		log.Printf("🔧 Processing WebRTC offer, creating session...")

		// Initialize WebRTC with the offer - ICE callback sends candidates to frontend
		_, answerSDP, err := InitializeWebRTCWithOffer(a.deviceID, sdpStr, func(candidate interface{}) {
			if candidate == nil {
				return
			}
			iceMsg := ClientMessage{
				Type:     "webrtc_ice",
				DeviceID: a.deviceID,
				Data: map[string]interface{}{
					"candidate": candidate,
				},
			}
			a.writeMux.Lock()
			a.conn.WriteJSON(iceMsg)
			a.writeMux.Unlock()
			log.Printf("📡 Sent ICE candidate to frontend")
		})

		if err != nil {
			log.Printf("❌ WebRTC initialization failed: %v", err)
			return nil
		}

		log.Printf("✅ WebRTC answer created, sending to frontend...")

		// Send answer back to frontend
		answerMsg := ClientMessage{
			Type:     "webrtc_answer",
			DeviceID: a.deviceID,
			Data: map[string]interface{}{
				"sdp": answerSDP,
			},
		}
		a.writeMux.Lock()
		a.conn.WriteJSON(answerMsg)
		a.writeMux.Unlock()
		log.Printf("📤 Sent WebRTC answer to frontend")

		return nil

	case "webrtc_ice":
		// Handle ICE candidate from frontend
		log.Printf("📡 Received ICE candidate from frontend")
		var iceData map[string]interface{}
		json.Unmarshal(dataJSON, &iceData)

		session := GetWebRTCSession(a.deviceID)
		if session != nil {
			if candidateData, ok := iceData["candidate"]; ok {
				candidateJSON, _ := json.Marshal(candidateData)
				session.HandleICECandidate(string(candidateJSON))
			}
		}

		return nil

	default:
		return map[string]interface{}{
			"success": false,
			"message": fmt.Sprintf("Unknown command: %s", cmdType),
		}
	}
}

func (a *Agent) Run() {
	// Register device
	if err := a.RegisterDevice(); err != nil {
		log.Printf("⚠️  Failed to register: %v", err)
	}

	// Start heartbeat ticker
	heartbeatTicker := time.NewTicker(10 * time.Second)
	defer heartbeatTicker.Stop()

	// Start system info ticker
	systemInfoTicker := time.NewTicker(2 * time.Second)
	defer systemInfoTicker.Stop()

	// Channel to signal when ListenForCommands exits (connection lost)
	disconnected := make(chan struct{})

	// Listen for commands in a goroutine
	go func() {
		a.ListenForCommands()
		close(disconnected)
	}()

	// Start network monitoring
	go a.monitorNetwork()

	log.Println("🚀 Agent running...")

	// Main loop
	for {
		select {
		case <-disconnected:
			// Connection lost, stop tickers and return to trigger reconnection
			return

		case <-heartbeatTicker.C:
			if err := a.SendHeartbeat(); err != nil {
				log.Printf("🔄 Heartbeat failed, connection may be lost")
			}

		case <-systemInfoTicker.C:
			if err := a.SendSystemInfo(); err != nil {
				log.Printf("🔄 System info failed, connection may be lost")
			}
		}
	}
}

func getLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "0.0.0.0"
	}

	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}

	return "0.0.0.0"
}

func getWallpaperPath() string {
	// For now, return a default wallpaper URL
	// In production, you could read from registry (Windows) or config files (Unix)
	return "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&q=80"
}

// Windows Service implementation is now in service_windows.go
// Unix daemon implementation is now in service_unix.go

func main() {
	runMain()
}
