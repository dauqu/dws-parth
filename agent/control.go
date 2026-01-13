//go:build windows
// +build windows

package main

import (
	"syscall"
	"time"
	"unicode/utf16"
)

var (
	user32                  = syscall.NewLazyDLL("user32.dll")
	procSetCursorPos        = user32.NewProc("SetCursorPos")
	procMouseEvent          = user32.NewProc("mouse_event")
	procKeyboardEvent       = user32.NewProc("keybd_event")
	procGetSystemMetrics    = user32.NewProc("GetSystemMetrics")
	procGetForegroundWindow = user32.NewProc("GetForegroundWindow")
	procShowWindow          = user32.NewProc("ShowWindow")
	procSendInput           = user32.NewProc("SendInput")
	procGetKeyboardLayout   = user32.NewProc("GetKeyboardLayout")
	procVkKeyScanExW        = user32.NewProc("VkKeyScanExW")
	procMapVirtualKeyW      = user32.NewProc("MapVirtualKeyW")
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
	MOUSEEVENTF_HWHEEL     = 0x1000
	MOUSEEVENTF_ABSOLUTE   = 0x8000

	KEYEVENTF_KEYUP       = 0x0002
	KEYEVENTF_EXTENDEDKEY = 0x0001
	KEYEVENTF_UNICODE     = 0x0004
	KEYEVENTF_SCANCODE    = 0x0008

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

	// Virtual Key Codes
	VK_LBUTTON    = 0x01
	VK_RBUTTON    = 0x02
	VK_CANCEL     = 0x03
	VK_MBUTTON    = 0x04
	VK_BACK       = 0x08
	VK_TAB        = 0x09
	VK_CLEAR      = 0x0C
	VK_RETURN     = 0x0D
	VK_SHIFT      = 0x10
	VK_CONTROL    = 0x11
	VK_MENU       = 0x12 // Alt
	VK_PAUSE      = 0x13
	VK_CAPITAL    = 0x14
	VK_ESCAPE     = 0x1B
	VK_SPACE      = 0x20
	VK_PRIOR      = 0x21 // Page Up
	VK_NEXT       = 0x22 // Page Down
	VK_END        = 0x23
	VK_HOME       = 0x24
	VK_LEFT       = 0x25
	VK_UP         = 0x26
	VK_RIGHT      = 0x27
	VK_DOWN       = 0x28
	VK_SELECT     = 0x29
	VK_PRINT      = 0x2A
	VK_EXECUTE    = 0x2B
	VK_SNAPSHOT   = 0x2C
	VK_INSERT     = 0x2D
	VK_DELETE     = 0x2E
	VK_HELP       = 0x2F
	VK_LWIN       = 0x5B
	VK_RWIN       = 0x5C
	VK_APPS       = 0x5D
	VK_NUMPAD0    = 0x60
	VK_NUMPAD1    = 0x61
	VK_NUMPAD2    = 0x62
	VK_NUMPAD3    = 0x63
	VK_NUMPAD4    = 0x64
	VK_NUMPAD5    = 0x65
	VK_NUMPAD6    = 0x66
	VK_NUMPAD7    = 0x67
	VK_NUMPAD8    = 0x68
	VK_NUMPAD9    = 0x69
	VK_MULTIPLY   = 0x6A
	VK_ADD        = 0x6B
	VK_SEPARATOR  = 0x6C
	VK_SUBTRACT   = 0x6D
	VK_DECIMAL    = 0x6E
	VK_DIVIDE     = 0x6F
	VK_F1         = 0x70
	VK_F2         = 0x71
	VK_F3         = 0x72
	VK_F4         = 0x73
	VK_F5         = 0x74
	VK_F6         = 0x75
	VK_F7         = 0x76
	VK_F8         = 0x77
	VK_F9         = 0x78
	VK_F10        = 0x79
	VK_F11        = 0x7A
	VK_F12        = 0x7B
	VK_NUMLOCK    = 0x90
	VK_SCROLL     = 0x91
	VK_LSHIFT     = 0xA0
	VK_RSHIFT     = 0xA1
	VK_LCONTROL   = 0xA2
	VK_RCONTROL   = 0xA3
	VK_LMENU      = 0xA4 // Left Alt
	VK_RMENU      = 0xA5 // Right Alt
	VK_OEM_1      = 0xBA // ;:
	VK_OEM_PLUS   = 0xBB // =+
	VK_OEM_COMMA  = 0xBC // ,<
	VK_OEM_MINUS  = 0xBD // -_
	VK_OEM_PERIOD = 0xBE // .>
	VK_OEM_2      = 0xBF // /?
	VK_OEM_3      = 0xC0 // `~
	VK_OEM_4      = 0xDB // [{
	VK_OEM_5      = 0xDC // \|
	VK_OEM_6      = 0xDD // ]}
	VK_OEM_7      = 0xDE // '"
)

// MouseControl represents mouse control actions
type MouseControl struct {
	Action       string `json:"action"` // move, click, leftclick, rightclick, leftdown, leftup, rightdown, rightup, doubleclick, scroll, dragstart, dragend
	X            int    `json:"x"`
	Y            int    `json:"y"`
	ScreenWidth  int    `json:"screenWidth"`
	ScreenHeight int    `json:"screenHeight"`
	Button       string `json:"button"`     // left, right, middle
	Delta        int    `json:"delta"`      // Scroll amount
	DeltaX       int    `json:"deltaX"`     // Horizontal scroll
	DeltaY       int    `json:"deltaY"`     // Vertical scroll
	ClickCount   int    `json:"clickCount"` // For double/triple clicks
}

// KeyboardControl represents keyboard actions
type KeyboardControl struct {
	Action    string   `json:"action"`    // keydown, keyup, keypress, type, combo
	Key       int      `json:"key"`       // Virtual key code
	KeyCode   string   `json:"keyCode"`   // Key name (e.g., "Enter", "Backspace")
	Text      string   `json:"text"`      // For typing text
	Modifiers []string `json:"modifiers"` // ["ctrl", "alt", "shift", "meta"]
	Keys      []int    `json:"keys"`      // Multiple keys for combo
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
	time.Sleep(10 * time.Millisecond) // Small delay for reliability
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

// MouseScroll simulates mouse scroll (vertical)
func MouseScroll(delta int) error {
	// delta is positive for scroll up, negative for scroll down
	// WHEEL_DELTA is 120
	procMouseEvent.Call(MOUSEEVENTF_WHEEL, 0, 0, uintptr(delta*120), 0)
	return nil
}

// MouseHScroll simulates horizontal mouse scroll
func MouseHScroll(delta int) error {
	// delta is positive for scroll right, negative for scroll left
	procMouseEvent.Call(MOUSEEVENTF_HWHEEL, 0, 0, uintptr(delta*120), 0)
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
	time.Sleep(10 * time.Millisecond) // Small delay for reliability
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

// KeyCombo simulates pressing multiple keys simultaneously (e.g., Ctrl+C)
func KeyCombo(keys []int) error {
	// Press all keys down
	for _, vk := range keys {
		KeyDown(vk)
		time.Sleep(10 * time.Millisecond)
	}
	// Release all keys in reverse order
	for i := len(keys) - 1; i >= 0; i-- {
		KeyUp(keys[i])
		time.Sleep(10 * time.Millisecond)
	}
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

	button := ctrl.Button
	if button == "" {
		button = "left"
	}

	switch ctrl.Action {
	case "move":
		return SetCursorPosition(x, y)
	case "click", "leftclick":
		SetCursorPosition(x, y)
		return MouseClick("left")
	case "rightclick":
		SetCursorPosition(x, y)
		return MouseClick("right")
	case "middleclick":
		SetCursorPosition(x, y)
		return MouseClick("middle")
	case "doubleclick":
		SetCursorPosition(x, y)
		MouseClick("left")
		time.Sleep(50 * time.Millisecond)
		return MouseClick("left")
	case "tripleclick":
		SetCursorPosition(x, y)
		MouseClick("left")
		time.Sleep(50 * time.Millisecond)
		MouseClick("left")
		time.Sleep(50 * time.Millisecond)
		return MouseClick("left")
	case "leftdown", "mousedown":
		SetCursorPosition(x, y)
		return MouseDown(button)
	case "leftup", "mouseup":
		SetCursorPosition(x, y)
		return MouseUp(button)
	case "rightdown":
		SetCursorPosition(x, y)
		return MouseDown("right")
	case "rightup":
		SetCursorPosition(x, y)
		return MouseUp("right")
	case "dragstart":
		SetCursorPosition(x, y)
		return MouseDown(button)
	case "drag":
		return SetCursorPosition(x, y)
	case "dragend":
		SetCursorPosition(x, y)
		return MouseUp(button)
	case "scroll":
		SetCursorPosition(x, y)
		if ctrl.DeltaY != 0 {
			return MouseScroll(ctrl.DeltaY)
		}
		return MouseScroll(ctrl.Delta)
	case "hscroll":
		SetCursorPosition(x, y)
		return MouseHScroll(ctrl.DeltaX)
	}

	return nil
}

// HandleKeyboardControl processes keyboard control commands
func HandleKeyboardControl(ctrl KeyboardControl) error {
	// Apply modifiers
	modifiersDown := func() {
		for _, mod := range ctrl.Modifiers {
			switch mod {
			case "ctrl", "control":
				KeyDown(VK_CONTROL)
			case "alt":
				KeyDown(VK_MENU)
			case "shift":
				KeyDown(VK_SHIFT)
			case "meta", "win", "cmd":
				KeyDown(VK_LWIN)
			}
		}
	}

	modifiersUp := func() {
		for _, mod := range ctrl.Modifiers {
			switch mod {
			case "ctrl", "control":
				KeyUp(VK_CONTROL)
			case "alt":
				KeyUp(VK_MENU)
			case "shift":
				KeyUp(VK_SHIFT)
			case "meta", "win", "cmd":
				KeyUp(VK_LWIN)
			}
		}
	}

	switch ctrl.Action {
	case "keypress":
		modifiersDown()
		vk := ctrl.Key
		if vk == 0 && ctrl.KeyCode != "" {
			vk = KeyCodeToVirtualKey(ctrl.KeyCode)
		}
		KeyPress(vk)
		modifiersUp()
		return nil
	case "keydown":
		vk := ctrl.Key
		if vk == 0 && ctrl.KeyCode != "" {
			vk = KeyCodeToVirtualKey(ctrl.KeyCode)
		}
		return KeyDown(vk)
	case "keyup":
		vk := ctrl.Key
		if vk == 0 && ctrl.KeyCode != "" {
			vk = KeyCodeToVirtualKey(ctrl.KeyCode)
		}
		return KeyUp(vk)
	case "type":
		// Type a string character by character using SendInput for better Unicode support
		for _, ch := range ctrl.Text {
			TypeChar(ch)
		}
		return nil
	case "combo":
		// Execute key combination
		modifiersDown()
		for _, vk := range ctrl.Keys {
			KeyPress(vk)
		}
		modifiersUp()
		return nil
	}

	return nil
}

// TypeChar types a single Unicode character
func TypeChar(ch rune) {
	// Convert rune to UTF-16
	utf16Chars := utf16.Encode([]rune{ch})

	for _, c := range utf16Chars {
		// Key down with unicode
		procKeyboardEvent.Call(
			0,
			uintptr(c),
			KEYEVENTF_UNICODE,
			0,
		)
		// Key up with unicode
		procKeyboardEvent.Call(
			0,
			uintptr(c),
			KEYEVENTF_UNICODE|KEYEVENTF_KEYUP,
			0,
		)
	}
}

// KeyCodeToVirtualKey converts a key code string to Windows virtual key code
func KeyCodeToVirtualKey(keyCode string) int {
	keyMap := map[string]int{
		// Letters
		"KeyA": 'A', "KeyB": 'B', "KeyC": 'C', "KeyD": 'D', "KeyE": 'E',
		"KeyF": 'F', "KeyG": 'G', "KeyH": 'H', "KeyI": 'I', "KeyJ": 'J',
		"KeyK": 'K', "KeyL": 'L', "KeyM": 'M', "KeyN": 'N', "KeyO": 'O',
		"KeyP": 'P', "KeyQ": 'Q', "KeyR": 'R', "KeyS": 'S', "KeyT": 'T',
		"KeyU": 'U', "KeyV": 'V', "KeyW": 'W', "KeyX": 'X', "KeyY": 'Y',
		"KeyZ": 'Z',

		// Numbers
		"Digit0": '0', "Digit1": '1', "Digit2": '2', "Digit3": '3', "Digit4": '4',
		"Digit5": '5', "Digit6": '6', "Digit7": '7', "Digit8": '8', "Digit9": '9',

		// Function keys
		"F1": VK_F1, "F2": VK_F2, "F3": VK_F3, "F4": VK_F4, "F5": VK_F5,
		"F6": VK_F6, "F7": VK_F7, "F8": VK_F8, "F9": VK_F9, "F10": VK_F10,
		"F11": VK_F11, "F12": VK_F12,

		// Navigation
		"ArrowUp": VK_UP, "ArrowDown": VK_DOWN, "ArrowLeft": VK_LEFT, "ArrowRight": VK_RIGHT,
		"Home": VK_HOME, "End": VK_END, "PageUp": VK_PRIOR, "PageDown": VK_NEXT,
		"Insert": VK_INSERT, "Delete": VK_DELETE,

		// Modifiers
		"ShiftLeft": VK_LSHIFT, "ShiftRight": VK_RSHIFT, "Shift": VK_SHIFT,
		"ControlLeft": VK_LCONTROL, "ControlRight": VK_RCONTROL, "Control": VK_CONTROL,
		"AltLeft": VK_LMENU, "AltRight": VK_RMENU, "Alt": VK_MENU,
		"MetaLeft": VK_LWIN, "MetaRight": VK_RWIN, "Meta": VK_LWIN,

		// Special keys
		"Enter": VK_RETURN, "Escape": VK_ESCAPE, "Backspace": VK_BACK,
		"Tab": VK_TAB, "Space": VK_SPACE, "CapsLock": VK_CAPITAL,
		"NumLock": VK_NUMLOCK, "ScrollLock": VK_SCROLL, "Pause": VK_PAUSE,
		"PrintScreen": VK_SNAPSHOT, "ContextMenu": VK_APPS,

		// Numpad
		"Numpad0": VK_NUMPAD0, "Numpad1": VK_NUMPAD1, "Numpad2": VK_NUMPAD2,
		"Numpad3": VK_NUMPAD3, "Numpad4": VK_NUMPAD4, "Numpad5": VK_NUMPAD5,
		"Numpad6": VK_NUMPAD6, "Numpad7": VK_NUMPAD7, "Numpad8": VK_NUMPAD8,
		"Numpad9": VK_NUMPAD9, "NumpadMultiply": VK_MULTIPLY, "NumpadAdd": VK_ADD,
		"NumpadSubtract": VK_SUBTRACT, "NumpadDecimal": VK_DECIMAL, "NumpadDivide": VK_DIVIDE,
		"NumpadEnter": VK_RETURN,

		// Punctuation
		"Semicolon": VK_OEM_1, "Equal": VK_OEM_PLUS, "Comma": VK_OEM_COMMA,
		"Minus": VK_OEM_MINUS, "Period": VK_OEM_PERIOD, "Slash": VK_OEM_2,
		"Backquote": VK_OEM_3, "BracketLeft": VK_OEM_4, "Backslash": VK_OEM_5,
		"BracketRight": VK_OEM_6, "Quote": VK_OEM_7,
	}

	if vk, ok := keyMap[keyCode]; ok {
		return vk
	}

	return 0
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
		return VK_SPACE
	case '\n', '\r':
		return VK_RETURN
	case '\t':
		return VK_TAB
	case '\b':
		return VK_BACK
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
