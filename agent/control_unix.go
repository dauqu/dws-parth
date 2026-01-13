//go:build !windows
// +build !windows

package main

import (
	"fmt"
)

// MouseControl represents mouse control actions
type MouseControl struct {
	Action       string `json:"action"`
	X            int    `json:"x"`
	Y            int    `json:"y"`
	ScreenWidth  int    `json:"screen_width"`
	ScreenHeight int    `json:"screen_height"`
	Button       string `json:"button"`
	Delta        int    `json:"delta"`
	DeltaX       int    `json:"delta_x"`
	DeltaY       int    `json:"delta_y"`
	ClickCount   int    `json:"click_count"`
}

// KeyboardControl represents keyboard actions
type KeyboardControl struct {
	Action    string   `json:"action"`
	Key       int      `json:"key"`
	KeyCode   string   `json:"keyCode"`
	Text      string   `json:"text"`
	Modifiers []string `json:"modifiers"`
	Keys      []int    `json:"keys"`
}

// WindowControl represents window control actions
type WindowControl struct {
	Action string `json:"action"`
}

// SetCursorPosition moves the mouse cursor to specified coordinates
func SetCursorPosition(x, y int) error {
	return fmt.Errorf("mouse control not supported on this platform")
}

// MouseClick simulates a mouse click
func MouseClick(button string) error {
	return fmt.Errorf("mouse control not supported on this platform")
}

// MouseDown simulates mouse button down
func MouseDown(button string) error {
	return fmt.Errorf("mouse control not supported on this platform")
}

// MouseUp simulates mouse button up
func MouseUp(button string) error {
	return fmt.Errorf("mouse control not supported on this platform")
}

// MouseScroll simulates mouse scroll (vertical)
func MouseScroll(delta int) error {
	return fmt.Errorf("mouse control not supported on this platform")
}

// MouseHScroll simulates horizontal mouse scroll
func MouseHScroll(delta int) error {
	return fmt.Errorf("mouse control not supported on this platform")
}

// KeyPress simulates a key press (down and up)
func KeyPress(vkCode int) error {
	return fmt.Errorf("keyboard control not supported on this platform")
}

// KeyDown simulates key down
func KeyDown(vkCode int) error {
	return fmt.Errorf("keyboard control not supported on this platform")
}

// KeyUp simulates key up
func KeyUp(vkCode int) error {
	return fmt.Errorf("keyboard control not supported on this platform")
}

// KeyCombo simulates pressing multiple keys simultaneously (e.g., Ctrl+C)
func KeyCombo(keys []int) error {
	return fmt.Errorf("keyboard control not supported on this platform")
}

// HandleMouseControl processes mouse control commands
func HandleMouseControl(ctrl MouseControl) error {
	return fmt.Errorf("mouse control not supported on this platform")
}

// HandleKeyboardControl processes keyboard control commands
func HandleKeyboardControl(ctrl KeyboardControl) error {
	return fmt.Errorf("keyboard control not supported on this platform")
}

// TypeChar types a single Unicode character
func TypeChar(ch rune) {
	// Not supported on this platform
}

// KeyCodeToVirtualKey converts a key code string to virtual key code
func KeyCodeToVirtualKey(keyCode string) int {
	return 0
}

// CharToVirtualKey converts a character to virtual key code
func CharToVirtualKey(ch rune) int {
	return 0
}

// GetForegroundWindow returns the handle to the foreground window
func GetForegroundWindow() uintptr {
	return 0
}

// MaximizeWindow maximizes the foreground window
func MaximizeWindow() error {
	return fmt.Errorf("window control not supported on this platform")
}

// MinimizeWindow minimizes the foreground window
func MinimizeWindow() error {
	return fmt.Errorf("window control not supported on this platform")
}

// RestoreWindow restores the foreground window to normal state
func RestoreWindow() error {
	return fmt.Errorf("window control not supported on this platform")
}

// HandleWindowControl handles window control actions
func HandleWindowControl(ctrl WindowControl) error {
	return fmt.Errorf("window control not supported on this platform")
}
