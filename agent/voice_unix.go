//go:build !windows
// +build !windows

package main

import (
	"encoding/json"
	"fmt"
	"sync"
)

// VoiceCapture handles audio capture state
type VoiceCapture struct {
	isCapturing bool
	captureData []byte
	mutex       sync.Mutex
	stopChan    chan struct{}
}

// VoiceChunk represents a voice data packet
type VoiceChunk struct {
	Audio      string `json:"audio"`
	Format     string `json:"format"`
	SampleRate int    `json:"sample_rate"`
	Channels   int    `json:"channels"`
	Timestamp  int64  `json:"timestamp"`
}

// VoiceCaptureOptions configures voice capture
type VoiceCaptureOptions struct {
	SampleRate int  `json:"sample_rate"`
	Channels   int  `json:"channels"`
	Compress   bool `json:"compress"`
}

var globalVoiceCapture *VoiceCapture

// InitVoiceCapture initializes the voice capture system
func InitVoiceCapture() error {
	return fmt.Errorf("voice capture not supported on this platform")
}

// StartVoiceCapture begins capturing audio
func StartVoiceCapture(options VoiceCaptureOptions) error {
	return fmt.Errorf("voice capture not supported on this platform")
}

// StopVoiceCapture stops audio capture
func StopVoiceCapture() {
	// No-op on non-Windows
}

// CaptureVoiceChunk captures a single chunk of audio data
func CaptureVoiceChunk(options VoiceCaptureOptions) (*VoiceChunk, error) {
	return nil, fmt.Errorf("voice capture not supported on this platform")
}

// HandleVoiceControl processes voice control commands
func HandleVoiceControl(data []byte) map[string]interface{} {
	var voiceData map[string]interface{}
	if err := json.Unmarshal(data, &voiceData); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": fmt.Sprintf("Failed to parse voice data: %v", err),
		}
	}

	return map[string]interface{}{
		"success": false,
		"message": "Voice capture is only available on Windows",
	}
}
