package main

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// WebRTC Signaling - handles SDP and ICE exchange between frontend and agent

// WebRTCSignalData is the nested data structure from frontend
type WebRTCSignalData struct {
	Type      string          `json:"type"`      // "offer", "answer", "ice_candidate"
	SDP       string          `json:"sdp"`       // SDP string for offer/answer
	Candidate json.RawMessage `json:"candidate"` // ICE candidate data
}

type WebRTCSession struct {
	FrontendConn  *websocket.Conn
	AgentDeviceID string
	mutex         sync.Mutex
}

var (
	webrtcSignalSessions = make(map[string]*WebRTCSession) // sessionID -> session
	webrtcSessionMutex   sync.RWMutex
)

// HandleWebRTCSignaling routes WebRTC signaling messages between frontend and agent
func HandleWebRTCSignaling(frontendConn *websocket.Conn, msg Message) {
	// Debug: Show raw data from frontend
	log.Printf("🔍 DEBUG: Raw WebRTC data from frontend: %s", string(msg.Data))

	// Frontend sends: { type: "webrtc_signal", device_id: "...", data: { type: "offer", sdp: "..." } }
	// The data field contains the actual signal data
	var signalData WebRTCSignalData
	err := json.Unmarshal(msg.Data, &signalData)
	if err != nil {
		log.Printf("Failed to parse WebRTC signal data: %v, raw data: %s", err, string(msg.Data))
		return
	}

	log.Printf("🔗 WebRTC signal: type=%s, SDP length=%d, deviceID=%s", signalData.Type, len(signalData.SDP), msg.DeviceID)

	switch signalData.Type {
	case "init":
		// Frontend wants to start WebRTC session with a device
		initWebRTCSession(frontendConn, msg.DeviceID, msg.DeviceID)

	case "offer":
		// Frontend created an offer, forward to agent with SDP
		if signalData.SDP == "" {
			log.Printf("⚠️ Empty SDP in WebRTC offer!")
			return
		}

		// Create the data payload for the agent
		offerData := map[string]interface{}{
			"type": "offer",
			"sdp":  signalData.SDP,
		}
		offerJSON, _ := json.Marshal(offerData)
		forwardToAgent(msg.DeviceID, "webrtc_offer", json.RawMessage(offerJSON))
		log.Printf("📤 Forwarded WebRTC offer to agent %s (SDP: %d chars)", msg.DeviceID, len(signalData.SDP))

	case "answer":
		// Agent created an answer, forward to frontend
		answerData := map[string]interface{}{
			"sdp": signalData.SDP,
		}
		answerJSON, _ := json.Marshal(answerData)
		forwardToFrontend(msg.DeviceID, "webrtc_answer", json.RawMessage(answerJSON))

	case "ice_candidate":
		// ICE candidate from frontend to agent
		candidateData := map[string]interface{}{
			"candidate": signalData.Candidate,
		}
		candidateJSON, _ := json.Marshal(candidateData)
		forwardToAgent(msg.DeviceID, "webrtc_ice", json.RawMessage(candidateJSON))
		log.Printf("📡 Forwarded ICE candidate to agent %s", msg.DeviceID)
	}
}

// initWebRTCSession creates a new WebRTC session mapping
func initWebRTCSession(frontendConn *websocket.Conn, sessionID, deviceID string) {
	webrtcSessionMutex.Lock()
	defer webrtcSessionMutex.Unlock()

	webrtcSignalSessions[sessionID] = &WebRTCSession{
		FrontendConn:  frontendConn,
		AgentDeviceID: deviceID,
	}

	log.Printf("Initialized WebRTC session %s for device %s", sessionID, deviceID)
}

// forwardToAgent forwards signaling message to agent
func forwardToAgent(deviceID, msgType string, data json.RawMessage) {
	err := hub.sendToClient(deviceID, Message{
		Type:     msgType,
		DeviceID: deviceID,
		Data:     data,
	})

	if err != nil {
		log.Printf("Failed to forward WebRTC signal to agent %s: %v", deviceID, err)
	}
}

// forwardToFrontend forwards signaling message to frontend
func forwardToFrontend(sessionID, msgType string, data json.RawMessage) {
	webrtcSessionMutex.RLock()
	session, exists := webrtcSignalSessions[sessionID]
	webrtcSessionMutex.RUnlock()

	if !exists || session.FrontendConn == nil {
		log.Printf("No frontend connection for WebRTC session %s", sessionID)
		return
	}

	session.mutex.Lock()
	defer session.mutex.Unlock()

	response := map[string]interface{}{
		"type":      msgType,
		"device_id": sessionID,
		"data":      json.RawMessage(data),
	}

	err := session.FrontendConn.WriteJSON(response)
	if err != nil {
		log.Printf("Failed to forward WebRTC signal to frontend: %v", err)
	}
}

// CleanupWebRTCSession removes a WebRTC session
func CleanupWebRTCSession(sessionID string) {
	webrtcSessionMutex.Lock()
	defer webrtcSessionMutex.Unlock()

	delete(webrtcSignalSessions, sessionID)
	log.Printf("Cleaned up WebRTC session %s", sessionID)
}
