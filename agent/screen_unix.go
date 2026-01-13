//go:build !windows
// +build !windows

package main

import (
	"bytes"
	"encoding/base64"
	"image/jpeg"

	"image"

	"github.com/kbinani/screenshot"
	"golang.org/x/image/draw"
)

type POINT struct {
	X int32
	Y int32
}

type ScreenCapture struct {
	Image         string `json:"image"`
	Width         int    `json:"width"`
	Height        int    `json:"height"`
	CursorX       int    `json:"cursor_x"`
	CursorY       int    `json:"cursor_y"`
	NetworkStatus string `json:"network_status,omitempty"`
}

type ScreenCaptureOptions struct {
	Quality      int  `json:"quality"`
	ShowCursor   bool `json:"show_cursor"`
	AdaptiveMode bool `json:"adaptive_mode"`
}

// GetCursorPosition returns the current cursor position
// On non-Windows platforms, this returns 0,0 (cursor tracking not implemented)
func GetCursorPosition() (int, int) {
	// TODO: Implement using X11/XDotool on Linux
	return 0, 0
}

func CaptureScreen() (*ScreenCapture, error) {
	return CaptureScreenWithOptions(ScreenCaptureOptions{Quality: 60, ShowCursor: true, AdaptiveMode: true})
}

func CaptureScreenWithOptions(options ScreenCaptureOptions) (*ScreenCapture, error) {
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

	// Default quality if not specified or invalid
	quality := options.Quality
	if quality <= 0 || quality > 100 {
		quality = 60
	}

	// Get current network status for adaptive quality
	netStatus := GetNetworkStatus()
	networkQuality := netStatus.Quality
	scaleFactor := 1.0

	// Adaptive quality adjustment based on network conditions
	if options.AdaptiveMode {
		switch networkQuality {
		case "slow":
			if quality > 30 {
				quality = 30
			}
			scaleFactor = 0.5
		case "medium":
			if quality > 50 {
				quality = 50
			}
			scaleFactor = 0.75
		}
	}

	// Scale image if needed for slow networks
	var finalImg image.Image = img
	if scaleFactor < 1.0 {
		newWidth := int(float64(bounds.Dx()) * scaleFactor)
		newHeight := int(float64(bounds.Dy()) * scaleFactor)
		scaledImg := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
		draw.CatmullRom.Scale(scaledImg, scaledImg.Bounds(), img, img.Bounds(), draw.Over, nil)
		finalImg = scaledImg
	}

	// Encode image to JPEG with configurable quality
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, finalImg, &jpeg.Options{Quality: quality})
	if err != nil {
		return nil, err
	}

	// Encode to base64
	encoded := base64.StdEncoding.EncodeToString(buf.Bytes())

	// Get cursor position
	cursorX, cursorY := 0, 0
	if options.ShowCursor {
		cursorX, cursorY = GetCursorPosition()
		// Scale cursor position if image was scaled
		if scaleFactor < 1.0 {
			cursorX = int(float64(cursorX) * scaleFactor)
			cursorY = int(float64(cursorY) * scaleFactor)
		}
	}

	return &ScreenCapture{
		Image:         encoded,
		Width:         finalImg.Bounds().Dx(),
		Height:        finalImg.Bounds().Dy(),
		CursorX:       cursorX,
		CursorY:       cursorY,
		NetworkStatus: networkQuality,
	}, nil
}

// MouseEvent represents a mouse action
type MouseEvent struct {
	Action string `json:"action"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

// KeyboardEvent represents a keyboard action
type KeyboardEvent struct {
	Action string `json:"action"`
	Key    string `json:"key"`
}
