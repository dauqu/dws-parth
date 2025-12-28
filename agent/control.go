package main

import (
	"syscall"
)

var (
	user32                  = syscall.NewLazyDLL("user32.dll")
	procSetCursorPos        = user32.NewProc("SetCursorPos")
	procMouseEvent          = user32.NewProc("mouse_event")
	procKeyboardEvent       = user32.NewProc("keybd_event")
	procGetSystemMetrics    = user32.NewProc("GetSystemMetrics")
	procGetForegroundWindow = user32.NewProc("GetForegroundWindow")
	procShowWindow          = user32.NewProc("ShowWindow")
)

const (
	MOUSEEVENTF_MOVE       = 0x0001
	MOUSEEVENTF_LEFTDOWN   = 0x0002
	MOUSEEVENTF_LEFTUP     = 0x0004
	MOUSEEVENTF_RIGHTDOWN  = 0x0008
	MOUSEEVENTF_RIGHTUP    = 0x0010
	MOUSEEVENTF_MIDDLEDOWN = 0x0020
	MOUSEEVENTF_MIDDLEUP   = 0x0040
	MOUSEEVENTF_WHEEL      = 0x0800
	MOUSEEVENTF_ABSOLUTE   = 0x8000

	KEYEVENTF_KEYUP = 0x0002

	SM_CXSCREEN = 0
	SM_CYSCREEN = 1

	// Window show commands
	SW_HIDE            = 0
	SW_SHOWNORMAL      = 1
	SW_SHOWMINIMIZED   = 2
	SW_SHOWMAXIMIZED   = 3
	SW_MAXIMIZE        = 3
	SW_SHOWNOACTIVATE  = 4
	SW_SHOW            = 5
	SW_MINIMIZE        = 6
	SW_SHOWMINNOACTIVE = 7
	SW_SHOWNA          = 8
	SW_RESTORE         = 9
)

// MouseControl represents mouse control actions
type MouseControl struct {
	Action       string `json:"action"` // move, leftclick, rightclick, leftdown, leftup, rightdown, rightup, doubleclick
	X            int    `json:"x"`
	Y            int    `json:"y"`
	ScreenWidth  int    `json:"screen_width"`
	ScreenHeight int    `json:"screen_height"`
}

// KeyboardControl represents keyboard actions
type KeyboardControl struct {
	Action string `json:"action"` // keydown, keyup, keypress
	Key    int    `json:"key"`    // Virtual key code
	Text   string `json:"text"`   // For typing text
}

// SetCursorPosition moves the mouse cursor to specified coordinates
func SetCursorPosition(x, y int) error {
	ret, _, err := procSetCursorPos.Call(
		uintptr(x),
		uintptr(y),
	)
	if ret == 0 {
		return err
	}
	return nil
}

// MouseClick simulates a mouse click
func MouseClick(button string) error {
	var downFlag, upFlag uintptr

	switch button {
	case "left":
		downFlag = MOUSEEVENTF_LEFTDOWN
		upFlag = MOUSEEVENTF_LEFTUP
	case "right":
		downFlag = MOUSEEVENTF_RIGHTDOWN
		upFlag = MOUSEEVENTF_RIGHTUP
	case "middle":
		downFlag = MOUSEEVENTF_MIDDLEDOWN
		upFlag = MOUSEEVENTF_MIDDLEUP
	default:
		downFlag = MOUSEEVENTF_LEFTDOWN
		upFlag = MOUSEEVENTF_LEFTUP
	}

	// Mouse down
	procMouseEvent.Call(downFlag, 0, 0, 0, 0)
	// Mouse up
	procMouseEvent.Call(upFlag, 0, 0, 0, 0)

	return nil
}

// MouseDown simulates mouse button down
func MouseDown(button string) error {
	var downFlag uintptr

	switch button {
	case "left":
		downFlag = MOUSEEVENTF_LEFTDOWN
	case "right":
		downFlag = MOUSEEVENTF_RIGHTDOWN
	case "middle":
		downFlag = MOUSEEVENTF_MIDDLEDOWN
	default:
		downFlag = MOUSEEVENTF_LEFTDOWN
	}

	procMouseEvent.Call(downFlag, 0, 0, 0, 0)
	return nil
}

// MouseUp simulates mouse button up
func MouseUp(button string) error {
	var upFlag uintptr

	switch button {
	case "left":
		upFlag = MOUSEEVENTF_LEFTUP
	case "right":
		upFlag = MOUSEEVENTF_RIGHTUP
	case "middle":
		upFlag = MOUSEEVENTF_MIDDLEUP
	default:
		upFlag = MOUSEEVENTF_LEFTUP
	}

	procMouseEvent.Call(upFlag, 0, 0, 0, 0)
	return nil
}

// KeyPress simulates a key press (down and up)
func KeyPress(vkCode int) error {
	// Key down
	procKeyboardEvent.Call(
		uintptr(vkCode),
		0,
		0,
		0,
	)
	// Key up
	procKeyboardEvent.Call(
		uintptr(vkCode),
		0,
		KEYEVENTF_KEYUP,
		0,
	)
	return nil
}

// KeyDown simulates key down
func KeyDown(vkCode int) error {
	procKeyboardEvent.Call(
		uintptr(vkCode),
		0,
		0,
		0,
	)
	return nil
}

// KeyUp simulates key up
func KeyUp(vkCode int) error {
	procKeyboardEvent.Call(
		uintptr(vkCode),
		0,
		KEYEVENTF_KEYUP,
		0,
	)
	return nil
}

// HandleMouseControl processes mouse control commands
func HandleMouseControl(ctrl MouseControl) error {
	// Scale coordinates if needed (from client screen to server screen)
	x := ctrl.X
	y := ctrl.Y

	// If client sends screen dimensions, scale coordinates
	if ctrl.ScreenWidth > 0 && ctrl.ScreenHeight > 0 {
		screenWidth, _, _ := procGetSystemMetrics.Call(SM_CXSCREEN)
		screenHeight, _, _ := procGetSystemMetrics.Call(SM_CYSCREEN)

		x = int(float64(ctrl.X) * float64(screenWidth) / float64(ctrl.ScreenWidth))
		y = int(float64(ctrl.Y) * float64(screenHeight) / float64(ctrl.ScreenHeight))
	}

	switch ctrl.Action {
	case "move":
		return SetCursorPosition(x, y)
	case "leftclick":
		SetCursorPosition(x, y)
		return MouseClick("left")
	case "rightclick":
		SetCursorPosition(x, y)
		return MouseClick("right")
	case "doubleclick":
		SetCursorPosition(x, y)
		MouseClick("left")
		return MouseClick("left")
	case "leftdown":
		SetCursorPosition(x, y)
		return MouseDown("left")
	case "leftup":
		return MouseUp("left")
	case "rightdown":
		SetCursorPosition(x, y)
		return MouseDown("right")
	case "rightup":
		return MouseUp("right")
	}

	return nil
}

// HandleKeyboardControl processes keyboard control commands
func HandleKeyboardControl(ctrl KeyboardControl) error {
	switch ctrl.Action {
	case "keypress":
		return KeyPress(ctrl.Key)
	case "keydown":
		return KeyDown(ctrl.Key)
	case "keyup":
		return KeyUp(ctrl.Key)
	case "type":
		// Type a string character by character
		for _, ch := range ctrl.Text {
			vk := CharToVirtualKey(ch)
			if vk > 0 {
				KeyPress(vk)
			}
		}
	}

	return nil
}

// CharToVirtualKey converts a character to Windows virtual key code
func CharToVirtualKey(ch rune) int {
	// Simple mapping for common characters
	if ch >= 'a' && ch <= 'z' {
		return int('A' + (ch - 'a'))
	}
	if ch >= 'A' && ch <= 'Z' {
		return int(ch)
	}
	if ch >= '0' && ch <= '9' {
		return int(ch)
	}

	// Special characters
	switch ch {
	case ' ':
		return 0x20 // VK_SPACE
	case '\n', '\r':
		return 0x0D // VK_RETURN
	case '\t':
		return 0x09 // VK_TAB
	case '\b':
		return 0x08 // VK_BACK
	}

	return 0
}

// WindowControl represents window control actions
type WindowControl struct {
	Action string `json:"action"` // maximize, minimize, restore, close
}

// GetForegroundWindow returns the handle to the foreground window
func GetForegroundWindow() uintptr {
	hwnd, _, _ := procGetForegroundWindow.Call()
	return hwnd
}

// MaximizeWindow maximizes the foreground window
func MaximizeWindow() error {
	hwnd := GetForegroundWindow()
	if hwnd == 0 {
		return nil
	}
	procShowWindow.Call(hwnd, SW_MAXIMIZE)
	return nil
}

// MinimizeWindow minimizes the foreground window
func MinimizeWindow() error {
	hwnd := GetForegroundWindow()
	if hwnd == 0 {
		return nil
	}
	procShowWindow.Call(hwnd, SW_MINIMIZE)
	return nil
}

// RestoreWindow restores the foreground window to normal state
func RestoreWindow() error {
	hwnd := GetForegroundWindow()
	if hwnd == 0 {
		return nil
	}
	procShowWindow.Call(hwnd, SW_RESTORE)
	return nil
}

// HandleWindowControl processes window control commands
func HandleWindowControl(ctrl WindowControl) error {
	switch ctrl.Action {
	case "maximize":
		return MaximizeWindow()
	case "minimize":
		return MinimizeWindow()
	case "restore":
		return RestoreWindow()
	}
	return nil
}
