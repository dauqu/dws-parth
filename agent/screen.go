package main

import (
	"bytes"
	"encoding/base64"
	"image/jpeg"

	"github.com/kbinani/screenshot"
)

type ScreenCapture struct {
	Image  string `json:"image"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

func CaptureScreen() (*ScreenCapture, error) {
	// Get the primary display
	n := screenshot.NumActiveDisplays()
	if n == 0 {
		return nil, nil
	}

	bounds := screenshot.GetDisplayBounds(0)
	img, err := screenshot.CaptureRect(bounds)
	if err != nil {
		return nil, err
	}

	// Encode image to JPEG with lower quality for faster transmission
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: 40})
	if err != nil {
		return nil, err
	}

	// Encode to base64
	encoded := base64.StdEncoding.EncodeToString(buf.Bytes())

	return &ScreenCapture{
		Image:  encoded,
		Width:  bounds.Dx(),
		Height: bounds.Dy(),
	}, nil
}

// MouseEvent represents a mouse action
type MouseEvent struct {
	Action string `json:"action"` // move, click, doubleclick, rightclick
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

// KeyboardEvent represents a keyboard action
type KeyboardEvent struct {
	Action string `json:"action"` // keydown, keyup, type
	Key    string `json:"key"`
}

// Note: For actual mouse/keyboard control on Windows, you'd need to use
// syscall to call Windows API functions like SetCursorPos, mouse_event, keybd_event
// This is a simplified version showing the structure
