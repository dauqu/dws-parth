package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"log"
	"sync"
	"time"

	"github.com/kbinani/screenshot"
	"github.com/pion/webrtc/v4"
	"golang.org/x/image/draw"
)

// WebRTC Screen Session using Data Channel
type WebRTCScreenSession struct {
	peerConnection *webrtc.PeerConnection
	dataChannel    *webrtc.DataChannel
	isStreaming    bool
	quality        int
	fps            int
	mutex          sync.Mutex
	stopChan       chan bool
	adaptiveMode   bool
	onICECandidate func(candidate interface{})
}

var (
	webrtcSessions = make(map[string]*WebRTCScreenSession)
	webrtcMutex    sync.RWMutex
)

// InitializeWebRTCWithOffer processes the browser's offer and creates an answer
func InitializeWebRTCWithOffer(sessionID string, offerSDP string, onICE func(candidate interface{})) (*WebRTCScreenSession, string, error) {
	webrtcMutex.Lock()
	defer webrtcMutex.Unlock()

	// Close existing session if any
	if existingSession, exists := webrtcSessions[sessionID]; exists {
		existingSession.Close()
		delete(webrtcSessions, sessionID)
	}

	// Configure WebRTC with STUN servers for production connectivity
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
			{URLs: []string{"stun:stun.l.google.com:5349"}},
			{URLs: []string{"stun:stun1.l.google.com:3478"}},
			{URLs: []string{"stun:stun1.l.google.com:5349"}},
			{URLs: []string{"stun:stun2.l.google.com:19302"}},
			{URLs: []string{"stun:stun2.l.google.com:5349"}},
			{URLs: []string{"stun:stun3.l.google.com:3478"}},
			{URLs: []string{"stun:stun3.l.google.com:5349"}},
			{URLs: []string{"stun:stun4.l.google.com:19302"}},
			{URLs: []string{"stun:stun4.l.google.com:5349"}},
		},
		ICETransportPolicy: webrtc.ICETransportPolicyAll,
		BundlePolicy:       webrtc.BundlePolicyMaxBundle,
	}

	// Create PeerConnection
	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create peer connection: %v", err)
	}

	session := &WebRTCScreenSession{
		peerConnection: peerConnection,
		isStreaming:    false,
		quality:        75,
		fps:            15, // Start with 15 FPS for data channel
		stopChan:       make(chan bool, 1),
		adaptiveMode:   true,
		onICECandidate: onICE,
	}

	// Create data channel for screen frames
	dataChannel, err := peerConnection.CreateDataChannel("screen", &webrtc.DataChannelInit{
		Ordered: func() *bool { v := true; return &v }(),
	})
	if err != nil {
		peerConnection.Close()
		return nil, "", fmt.Errorf("failed to create data channel: %v", err)
	}
	session.dataChannel = dataChannel

	// Handle data channel open
	dataChannel.OnOpen(func() {
		log.Printf("📺 Data channel opened, starting screen streaming...")
		go session.StartStreaming()
	})

	dataChannel.OnClose(func() {
		log.Printf("📺 Data channel closed")
		session.StopStreaming()
	})

	// Handle incoming data channels from frontend (control channel)
	peerConnection.OnDataChannel(func(dc *webrtc.DataChannel) {
		log.Printf("🎮 Received data channel: %s", dc.Label())

		if dc.Label() == "control" {
			dc.OnOpen(func() {
				log.Printf("🎮 Control channel opened")
			})

			dc.OnMessage(func(msg webrtc.DataChannelMessage) {
				// Parse control command to get type
				var cmd map[string]interface{}
				if err := json.Unmarshal(msg.Data, &cmd); err != nil {
					log.Printf("⚠️ Failed to parse control command: %v", err)
					return
				}

				cmdType, _ := cmd["type"].(string)

				switch cmdType {
				case "mouse":
					var ctrl MouseControl
					if err := json.Unmarshal(msg.Data, &ctrl); err == nil {
						HandleMouseControl(ctrl)
					}
				case "keyboard":
					var ctrl KeyboardControl
					if err := json.Unmarshal(msg.Data, &ctrl); err == nil {
						HandleKeyboardControl(ctrl)
					}
				}
			})
		}
	})

	// Handle ICE candidates
	peerConnection.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate != nil && session.onICECandidate != nil {
			session.onICECandidate(candidate.ToJSON())
		}
	})

	// Handle connection state
	peerConnection.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		log.Printf("🔗 WebRTC Connection State: %s", state.String())
		if state == webrtc.PeerConnectionStateFailed || state == webrtc.PeerConnectionStateDisconnected {
			session.StopStreaming()
		}
	})

	// Set the remote description (offer from browser)
	offer := webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  offerSDP,
	}
	err = peerConnection.SetRemoteDescription(offer)
	if err != nil {
		peerConnection.Close()
		return nil, "", fmt.Errorf("failed to set remote description: %v", err)
	}

	// Create answer
	answer, err := peerConnection.CreateAnswer(nil)
	if err != nil {
		peerConnection.Close()
		return nil, "", fmt.Errorf("failed to create answer: %v", err)
	}

	// Set local description
	err = peerConnection.SetLocalDescription(answer)
	if err != nil {
		peerConnection.Close()
		return nil, "", fmt.Errorf("failed to set local description: %v", err)
	}

	webrtcSessions[sessionID] = session

	log.Printf("✅ WebRTC session initialized with data channel for %s", sessionID)
	return session, answer.SDP, nil
}

// StartStreaming captures and sends screen frames via data channel
func (s *WebRTCScreenSession) StartStreaming() error {
	s.mutex.Lock()
	if s.isStreaming {
		s.mutex.Unlock()
		return fmt.Errorf("already streaming")
	}
	s.isStreaming = true
	s.mutex.Unlock()

	log.Printf("🎬 Starting WebRTC screen streaming at %d FPS via data channel", s.fps)

	ticker := time.NewTicker(time.Second / time.Duration(s.fps))
	defer ticker.Stop()

	frameCount := 0
	lastLogTime := time.Now()

	for {
		select {
		case <-s.stopChan:
			log.Printf("🛑 Stopping WebRTC screen streaming")
			return nil
		case <-ticker.C:
			if !s.isStreaming || s.dataChannel == nil {
				return nil
			}

			// Check data channel is ready
			if s.dataChannel.ReadyState() != webrtc.DataChannelStateOpen {
				continue
			}

			// Capture screen frame
			frame, width, height, err := s.captureFrame()
			if err != nil {
				continue
			}

			// Create frame message
			frameMsg := map[string]interface{}{
				"type":   "frame",
				"image":  base64.StdEncoding.EncodeToString(frame),
				"width":  width,
				"height": height,
				"ts":     time.Now().UnixMilli(),
			}

			frameJSON, err := json.Marshal(frameMsg)
			if err != nil {
				continue
			}

			// Send via data channel
			err = s.dataChannel.Send(frameJSON)
			if err != nil {
				log.Printf("⚠️ Failed to send frame: %v", err)
				continue
			}

			frameCount++
			if time.Since(lastLogTime) >= 10*time.Second {
				log.Printf("📊 Sent %d frames in last 10s (%.1f FPS)", frameCount, float64(frameCount)/10.0)
				frameCount = 0
				lastLogTime = time.Now()
			}
		}
	}
}

// StopStreaming stops screen capture
func (s *WebRTCScreenSession) StopStreaming() {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if !s.isStreaming {
		return
	}

	s.isStreaming = false
	select {
	case s.stopChan <- true:
	default:
	}
	log.Printf("Stopped WebRTC screen streaming")
}

// captureFrame captures a screen frame as JPEG
func (s *WebRTCScreenSession) captureFrame() ([]byte, int, int, error) {
	n := screenshot.NumActiveDisplays()
	if n == 0 {
		return nil, 0, 0, fmt.Errorf("no active displays")
	}

	bounds := screenshot.GetDisplayBounds(0)
	img, err := screenshot.CaptureRect(bounds)
	if err != nil {
		return nil, 0, 0, err
	}

	width := bounds.Dx()
	height := bounds.Dy()

	// Scale down for better performance on data channel
	var finalImg image.Image = img
	scaleFactor := 0.5 // Scale to 50% for data channel efficiency

	if s.adaptiveMode {
		// Could adjust based on connection quality
		scaleFactor = 0.5
	}

	if scaleFactor < 1.0 {
		newWidth := int(float64(width) * scaleFactor)
		newHeight := int(float64(height) * scaleFactor)
		scaledImg := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
		draw.CatmullRom.Scale(scaledImg, scaledImg.Bounds(), img, img.Bounds(), draw.Over, nil)
		finalImg = scaledImg
		width = newWidth
		height = newHeight
	}

	// Encode as JPEG
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, finalImg, &jpeg.Options{Quality: s.quality})
	if err != nil {
		return nil, 0, 0, err
	}

	return buf.Bytes(), width, height, nil
}

// HandleICECandidate adds ICE candidate from browser
func (s *WebRTCScreenSession) HandleICECandidate(candidateJSON string) error {
	var candidate webrtc.ICECandidateInit
	err := json.Unmarshal([]byte(candidateJSON), &candidate)
	if err != nil {
		return fmt.Errorf("failed to unmarshal ICE candidate: %v", err)
	}

	err = s.peerConnection.AddICECandidate(candidate)
	if err != nil {
		return fmt.Errorf("failed to add ICE candidate: %v", err)
	}

	return nil
}

// Close closes the session
func (s *WebRTCScreenSession) Close() error {
	s.StopStreaming()
	if s.peerConnection != nil {
		return s.peerConnection.Close()
	}
	return nil
}

// GetWebRTCSession retrieves a session
func GetWebRTCSession(sessionID string) *WebRTCScreenSession {
	webrtcMutex.RLock()
	defer webrtcMutex.RUnlock()
	return webrtcSessions[sessionID]
}

// CloseWebRTCSession closes and removes a session
func CloseWebRTCSession(sessionID string) {
	webrtcMutex.Lock()
	defer webrtcMutex.Unlock()
	if session, exists := webrtcSessions[sessionID]; exists {
		session.Close()
		delete(webrtcSessions, sessionID)
	}
}
