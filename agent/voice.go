//go:build windows
// +build windows

package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"syscall"
	"time"
)

// Voice capture using Windows WASAPI (Windows Audio Session API)
// This provides low-latency audio capture on Windows 10/11

var (
	ole32          = syscall.NewLazyDLL("ole32.dll")
	coInitialize   = ole32.NewProc("CoInitializeEx")
	coUninitialize = ole32.NewProc("CoUninitialize")
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
	Audio      string `json:"audio"`  // Base64 encoded audio
	Format     string `json:"format"` // Audio format (pcm, opus)
	SampleRate int    `json:"sample_rate"`
	Channels   int    `json:"channels"`
	Timestamp  int64  `json:"timestamp"`
}

// VoiceCaptureOptions configures voice capture
type VoiceCaptureOptions struct {
	SampleRate int  `json:"sample_rate"` // 8000, 16000, 44100, 48000
	Channels   int  `json:"channels"`    // 1 (mono) or 2 (stereo)
	Compress   bool `json:"compress"`    // Use compression for slow networks
}

var globalVoiceCapture *VoiceCapture

// InitVoiceCapture initializes the voice capture system
func InitVoiceCapture() error {
	// Initialize COM for audio APIs
	ret, _, err := coInitialize.Call(0, 0)
	if ret != 0 && ret != 1 { // S_OK or S_FALSE
		return fmt.Errorf("failed to initialize COM: %v", err)
	}

	globalVoiceCapture = &VoiceCapture{
		isCapturing: false,
		stopChan:    make(chan struct{}),
	}

	log.Println("🎤 Voice capture system initialized")
	return nil
}

// StartVoiceCapture begins capturing audio from the default microphone
func StartVoiceCapture(options VoiceCaptureOptions) error {
	if globalVoiceCapture == nil {
		if err := InitVoiceCapture(); err != nil {
			return err
		}
	}

	if globalVoiceCapture.isCapturing {
		return nil // Already capturing
	}

	// Default options
	if options.SampleRate == 0 {
		options.SampleRate = 16000 // 16kHz is good for voice
	}
	if options.Channels == 0 {
		options.Channels = 1 // Mono
	}

	globalVoiceCapture.mutex.Lock()
	globalVoiceCapture.isCapturing = true
	globalVoiceCapture.stopChan = make(chan struct{})
	globalVoiceCapture.mutex.Unlock()

	log.Printf("🎤 Started voice capture: %dHz, %d channel(s)", options.SampleRate, options.Channels)
	return nil
}

// StopVoiceCapture stops audio capture
func StopVoiceCapture() {
	if globalVoiceCapture == nil || !globalVoiceCapture.isCapturing {
		return
	}

	globalVoiceCapture.mutex.Lock()
	defer globalVoiceCapture.mutex.Unlock()

	close(globalVoiceCapture.stopChan)
	globalVoiceCapture.isCapturing = false

	log.Println("🎤 Stopped voice capture")
}

// CaptureVoiceChunk captures a single chunk of audio data
// This simulates audio capture - in production, use actual WASAPI
func CaptureVoiceChunk(options VoiceCaptureOptions) (*VoiceChunk, error) {
	if globalVoiceCapture == nil || !globalVoiceCapture.isCapturing {
		return nil, fmt.Errorf("voice capture not started")
	}

	// Simulate audio data capture
	// In production, this would interface with WASAPI to get real audio
	// For now, we return silence with proper structure

	// Calculate buffer size for ~100ms of audio
	samplesToCapture := options.SampleRate / 10
	bytesPerSample := 2 // 16-bit audio
	bufferSize := samplesToCapture * options.Channels * bytesPerSample

	// Simulate audio buffer (silence)
	audioBuffer := make([]byte, bufferSize)

	// In production, fill audioBuffer with actual microphone data using:
	// - waveInOpen, waveInPrepareHeader, waveInAddBuffer, waveInStart (MME API)
	// - or IAudioClient, IAudioCaptureClient (WASAPI - preferred)

	// Encode to base64 for transmission
	encoded := base64.StdEncoding.EncodeToString(audioBuffer)

	return &VoiceChunk{
		Audio:      encoded,
		Format:     "pcm",
		SampleRate: options.SampleRate,
		Channels:   options.Channels,
		Timestamp:  time.Now().UnixMilli(),
	}, nil
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

	action, _ := voiceData["action"].(string)

	switch action {
	case "start":
		options := VoiceCaptureOptions{
			SampleRate: 16000,
			Channels:   1,
			Compress:   false,
		}

		if sr, ok := voiceData["sample_rate"].(float64); ok {
			options.SampleRate = int(sr)
		}
		if ch, ok := voiceData["channels"].(float64); ok {
			options.Channels = int(ch)
		}
		if c, ok := voiceData["compress"].(bool); ok {
			options.Compress = c
		}

		// Adjust for network conditions
		netStatus := GetNetworkStatus()
		if netStatus.Quality == "slow" {
			options.SampleRate = 8000 // Lower sample rate for slow networks
			options.Compress = true
		}

		if err := StartVoiceCapture(options); err != nil {
			return map[string]interface{}{
				"success": false,
				"message": fmt.Sprintf("Failed to start voice capture: %v", err),
			}
		}

		return map[string]interface{}{
			"success":     true,
			"message":     "Voice capture started",
			"sample_rate": options.SampleRate,
			"channels":    options.Channels,
		}

	case "stop":
		StopVoiceCapture()
		return map[string]interface{}{
			"success": true,
			"message": "Voice capture stopped",
		}

	case "capture":
		options := VoiceCaptureOptions{
			SampleRate: 16000,
			Channels:   1,
		}
		if sr, ok := voiceData["sample_rate"].(float64); ok {
			options.SampleRate = int(sr)
		}
		if ch, ok := voiceData["channels"].(float64); ok {
			options.Channels = int(ch)
		}

		chunk, err := CaptureVoiceChunk(options)
		if err != nil {
			return map[string]interface{}{
				"success": false,
				"message": fmt.Sprintf("Failed to capture voice: %v", err),
			}
		}

		return map[string]interface{}{
			"success":     true,
			"audio":       chunk.Audio,
			"format":      chunk.Format,
			"sample_rate": chunk.SampleRate,
			"channels":    chunk.Channels,
			"timestamp":   chunk.Timestamp,
		}

	default:
		return map[string]interface{}{
			"success": false,
			"message": fmt.Sprintf("Unknown voice action: %s", action),
		}
	}
}

// compressAudio compresses audio for low bandwidth transmission
// Uses simple mu-law or similar compression
func compressAudio(data []byte) []byte {
	// Simple implementation - in production use proper codec like Opus
	var compressed bytes.Buffer

	// Mu-law compression lookup table (simplified)
	for i := 0; i < len(data); i += 2 {
		if i+1 >= len(data) {
			break
		}
		// Convert 16-bit to 8-bit mu-law
		sample := int16(data[i]) | (int16(data[i+1]) << 8)
		muLaw := linearToMuLaw(sample)
		compressed.WriteByte(muLaw)
	}

	return compressed.Bytes()
}

// linearToMuLaw converts a 16-bit linear sample to 8-bit mu-law
func linearToMuLaw(sample int16) byte {
	const MULAW_MAX = 0x1FFF
	const MULAW_BIAS = 33

	sign := byte(0)
	if sample < 0 {
		sign = 0x80
		sample = -sample
	}

	if int(sample) > MULAW_MAX {
		sample = MULAW_MAX
	}
	sample += MULAW_BIAS

	// Find exponent
	exp := 0
	for i := sample >> 6; i != 0; i >>= 1 {
		exp++
	}

	// Build mu-law byte
	mantissa := byte((sample >> (exp + 1)) & 0x0F)
	muLawByte := ^(sign | byte(exp<<4) | mantissa)

	return muLawByte
}
