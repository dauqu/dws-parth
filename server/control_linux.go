//go:build !windows
// +build !windows

package main

import (
	"encoding/json"
	"fmt"
)

// MouseControl represents mouse control actions
type MouseControl struct {
	Action       string `json:"action"` // move, leftclick, rightclick, leftdown, leftup, rightdown, rightup, doubleclick
	X            int    `json:"x"`
	Y            int    `json:"y"`
	Wheel        int    `json:"wheel"`    // positive for up, negative for down
	MoveDuration int    `json:"duration"` // duration in milliseconds for move actions
	DoubleClick  bool   `json:"double"`
}

// KeyboardControl represents keyboard control actions
type KeyboardControl struct {
	Action string `json:"action"` // press, keydown, keyup
	Key    string `json:"key"`    // key code or character
}

// ControlResponse represents response from control operations
type ControlResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// HandleMouseControl handles mouse control on Linux (not supported)
func HandleMouseControl(action MouseControl) ControlResponse {
	return ControlResponse{
		Success: false,
		Message: "Mouse control not supported on Linux",
	}
}

// HandleMouseControlJSON handles mouse control from JSON
func HandleMouseControlJSON(data []byte) ([]byte, error) {
	var action MouseControl
	if err := json.Unmarshal(data, &action); err != nil {
		return nil, err
	}

	response := HandleMouseControl(action)
	return json.Marshal(response)
}

// HandleKeyboardControl handles keyboard control on Linux (not supported)
func HandleKeyboardControl(action KeyboardControl) ControlResponse {
	return ControlResponse{
		Success: false,
		Message: "Keyboard control not supported on Linux",
	}
}

// HandleKeyboardControlJSON handles keyboard control from JSON
func HandleKeyboardControlJSON(data []byte) ([]byte, error) {
	var action KeyboardControl
	if err := json.Unmarshal(data, &action); err != nil {
		return nil, err
	}

	response := HandleKeyboardControl(action)
	return json.Marshal(response)
}

// GetScreenResolution gets screen resolution on Linux (returns 0,0)
func GetScreenResolution() (int, int) {
	return 0, 0
}

// GetMousePosition gets current mouse position on Linux (returns 0,0)
func GetMousePosition() (int, int) {
	return 0, 0
}

// MoveMouseSmooth moves mouse smoothly on Linux (not supported)
func MoveMouseSmooth(fromX, fromY, toX, toY int, duration int) error {
	return fmt.Errorf("mouse control not supported on Linux")
}

// SetCursorPosition sets cursor position on Linux (not supported)
func SetCursorPosition(x, y int) error {
	return fmt.Errorf("mouse control not supported on Linux")
}

// MouseClick performs mouse click on Linux (not supported)
func MouseClick(x, y int, button string) error {
	return fmt.Errorf("mouse control not supported on Linux")
}

// DoubleClick performs double click on Linux (not supported)
func DoubleClick(x, y int) error {
	return fmt.Errorf("mouse control not supported on Linux")
}

// MouseWheel performs mouse wheel scroll on Linux (not supported)
func MouseWheel(x, y int, direction int) error {
	return fmt.Errorf("mouse control not supported on Linux")
}

// PressKey simulates key press on Linux (not supported)
func PressKey(key string) error {
	return fmt.Errorf("keyboard control not supported on Linux")
}

// KeyDown simulates key down on Linux (not supported)
func KeyDown(key string) error {
	return fmt.Errorf("keyboard control not supported on Linux")
}

// KeyUp simulates key up on Linux (not supported)
func KeyUp(key string) error {
	return fmt.Errorf("keyboard control not supported on Linux")
}
