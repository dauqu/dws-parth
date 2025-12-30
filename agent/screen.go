package main

import (
	"bytes"
	"encoding/base64"
	"image/jpeg"
	"unsafe"

	"github.com/kbinani/screenshot"
)

// getCursorPos uses user32 from control.go
var getCursorPos = user32.NewProc("GetCursorPos")

type POINT struct {
	X int32
	Y int32
}

type ScreenCapture struct {
	Image   string `json:"image"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
	CursorX int    `json:"cursor_x"`
	CursorY int    `json:"cursor_y"`
}

type ScreenCaptureOptions struct {
	Quality    int  `json:"quality"`
	ShowCursor bool `json:"show_cursor"`
}

// GetCursorPosition returns the current cursor position
func GetCursorPosition() (int, int) {
	var pt POINT
	getCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
	return int(pt.X), int(pt.Y)
}

func CaptureScreen() (*ScreenCapture, error) {
	return CaptureScreenWithOptions(ScreenCaptureOptions{Quality: 60, ShowCursor: true})
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

	// Encode image to JPEG with configurable quality
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality})
	if err != nil {
		return nil, err
	}

	// Encode to base64
	encoded := base64.StdEncoding.EncodeToString(buf.Bytes())

	// Get cursor position
	cursorX, cursorY := 0, 0
	if options.ShowCursor {
		cursorX, cursorY = GetCursorPosition()
	}

	return &ScreenCapture{
		Image:   encoded,
		Width:   bounds.Dx(),
		Height:  bounds.Dy(),
		CursorX: cursorX,
		CursorY: cursorY,
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
