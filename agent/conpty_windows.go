//go:build windows
// +build windows

package main

import (
	"fmt"
	"io"
	"os"
	"sync"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	kernel32                              = windows.NewLazySystemDLL("kernel32.dll")
	procCreatePseudoConsole               = kernel32.NewProc("CreatePseudoConsole")
	procResizePseudoConsole               = kernel32.NewProc("ResizePseudoConsole")
	procClosePseudoConsole                = kernel32.NewProc("ClosePseudoConsole")
	procCreatePipe                        = kernel32.NewProc("CreatePipe")
	procInitializeProcThreadAttributeList = kernel32.NewProc("InitializeProcThreadAttributeList")
	procUpdateProcThreadAttribute         = kernel32.NewProc("UpdateProcThreadAttribute")
)

const (
	PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE = 0x00020016
	EXTENDED_STARTUPINFO_PRESENT        = 0x00080000
)

// COORD represents a coordinate in the console
type COORD struct {
	X int16
	Y int16
}

// ConPTYHandle represents a pseudo console handle
type ConPTYHandle uintptr

// ConPTYSession manages a pseudo console session
type ConPTYSession struct {
	handle     ConPTYHandle
	inputPipe  *os.File
	outputPipe *os.File
	process    *os.Process
	mutex      sync.Mutex
	cols       int16
	rows       int16
}

// IsConPTYAvailable checks if ConPTY is available on this Windows version
// ConPTY was introduced in Windows 10 1809 (build 17763)
func IsConPTYAvailable() bool {
	version := windows.RtlGetVersion()
	// Windows 10 1809 is build 17763
	return version.MajorVersion > 10 ||
		(version.MajorVersion == 10 && version.BuildNumber >= 17763)
}

// CreateConPTY creates a new pseudo console
func CreateConPTY(cols, rows int16) (*ConPTYSession, error) {
	if !IsConPTYAvailable() {
		return nil, fmt.Errorf("ConPTY not available on this Windows version (requires Windows 10 1809+)")
	}

	session := &ConPTYSession{
		cols: cols,
		rows: rows,
	}

	// Create pipes for input and output
	var readPipe, writePipe windows.Handle
	var inputRead, inputWrite windows.Handle

	// Create output pipe (ConPTY writes here, we read from it)
	err := windows.CreatePipe(&readPipe, &writePipe, nil, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to create output pipe: %v", err)
	}

	// Create input pipe (we write here, ConPTY reads from it)
	err = windows.CreatePipe(&inputRead, &inputWrite, nil, 0)
	if err != nil {
		windows.CloseHandle(readPipe)
		windows.CloseHandle(writePipe)
		return nil, fmt.Errorf("failed to create input pipe: %v", err)
	}

	// Create the pseudo console
	coord := COORD{X: cols, Y: rows}
	var hPC uintptr

	ret, _, err := procCreatePseudoConsole.Call(
		uintptr(unsafe.Pointer(&coord)),
		uintptr(inputRead),
		uintptr(writePipe),
		0, // flags
		uintptr(unsafe.Pointer(&hPC)),
	)

	if ret != 0 { // S_OK is 0
		windows.CloseHandle(readPipe)
		windows.CloseHandle(writePipe)
		windows.CloseHandle(inputRead)
		windows.CloseHandle(inputWrite)
		return nil, fmt.Errorf("CreatePseudoConsole failed: %v", err)
	}

	session.handle = ConPTYHandle(hPC)

	// Convert Windows handles to Go files
	session.outputPipe = os.NewFile(uintptr(readPipe), "conpty-output")
	session.inputPipe = os.NewFile(uintptr(inputWrite), "conpty-input")

	// Close the handles we don't need (ConPTY owns them now)
	windows.CloseHandle(inputRead)
	windows.CloseHandle(writePipe)

	return session, nil
}

// Resize resizes the pseudo console
func (s *ConPTYSession) Resize(cols, rows int16) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	coord := COORD{X: cols, Y: rows}
	ret, _, err := procResizePseudoConsole.Call(
		uintptr(s.handle),
		uintptr(unsafe.Pointer(&coord)),
	)

	if ret != 0 { // S_OK is 0
		return fmt.Errorf("ResizePseudoConsole failed: %v", err)
	}

	s.cols = cols
	s.rows = rows
	return nil
}

// Write writes data to the pseudo console input
func (s *ConPTYSession) Write(data []byte) (int, error) {
	return s.inputPipe.Write(data)
}

// Read reads data from the pseudo console output
func (s *ConPTYSession) Read(buf []byte) (int, error) {
	return s.outputPipe.Read(buf)
}

// StartProcess starts a process attached to the pseudo console
func (s *ConPTYSession) StartProcess(command string, args []string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// Prepare startup info with pseudo console attribute
	var si windows.StartupInfoEx
	si.Cb = uint32(unsafe.Sizeof(si))

	// Initialize attribute list
	var size uintptr
	procInitializeProcThreadAttributeList.Call(0, 1, 0, uintptr(unsafe.Pointer(&size)))

	attrList := make([]byte, size)
	// ProcThreadAttributeList needs to be set as a pointer to the attribute buffer
	si.ProcThreadAttributeList = (*windows.ProcThreadAttributeList)(unsafe.Pointer(&attrList[0]))

	ret, _, err := procInitializeProcThreadAttributeList.Call(
		uintptr(unsafe.Pointer(&attrList[0])),
		1, // Attribute count
		0, // Reserved
		uintptr(unsafe.Pointer(&size)),
	)
	if ret == 0 {
		return fmt.Errorf("InitializeProcThreadAttributeList failed: %v", err)
	}

	// Update with pseudo console attribute
	ret, _, err = procUpdateProcThreadAttribute.Call(
		uintptr(unsafe.Pointer(si.ProcThreadAttributeList)),
		0, // Flags
		PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE,
		uintptr(s.handle),
		unsafe.Sizeof(s.handle),
		0, // Previous value
		0, // Return size
	)
	if ret == 0 {
		return fmt.Errorf("UpdateProcThreadAttribute failed: %v", err)
	}

	// Build command line
	cmdLine := command
	for _, arg := range args {
		cmdLine += " " + arg
	}

	// Convert to UTF16
	cmdLinePtr, err := syscall.UTF16PtrFromString(cmdLine)
	if err != nil {
		return fmt.Errorf("failed to convert command line: %v", err)
	}

	// Create process
	var pi windows.ProcessInformation
	err = windows.CreateProcess(
		nil,        // Application name
		cmdLinePtr, // Command line
		nil,        // Process attributes
		nil,        // Thread attributes
		false,      // Inherit handles
		EXTENDED_STARTUPINFO_PRESENT|windows.CREATE_UNICODE_ENVIRONMENT,
		nil, // Environment
		nil, // Current directory
		&si.StartupInfo,
		&pi,
	)

	if err != nil {
		return fmt.Errorf("CreateProcess failed: %v", err)
	}

	// Close thread handle, we don't need it
	windows.CloseHandle(pi.Thread)

	// Store process handle
	s.process, err = os.FindProcess(int(pi.ProcessId))
	if err != nil {
		windows.CloseHandle(pi.Process)
		return fmt.Errorf("failed to find process: %v", err)
	}

	return nil
}

// Wait waits for the process to exit
func (s *ConPTYSession) Wait() error {
	if s.process == nil {
		return fmt.Errorf("no process started")
	}

	state, err := s.process.Wait()
	if err != nil {
		return err
	}

	if !state.Success() {
		return fmt.Errorf("process exited with code %d", state.ExitCode())
	}

	return nil
}

// Close closes the pseudo console and associated resources
func (s *ConPTYSession) Close() error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	var errs []error

	// Close pipes
	if s.inputPipe != nil {
		if err := s.inputPipe.Close(); err != nil {
			errs = append(errs, err)
		}
	}
	if s.outputPipe != nil {
		if err := s.outputPipe.Close(); err != nil {
			errs = append(errs, err)
		}
	}

	// Close pseudo console
	if s.handle != 0 {
		procClosePseudoConsole.Call(uintptr(s.handle))
		s.handle = 0
	}

	// Kill process if still running
	if s.process != nil {
		s.process.Kill()
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors closing ConPTY: %v", errs)
	}

	return nil
}

// Copy helper to copy data between reader and writer
func (s *ConPTYSession) CopyOutput(w io.Writer) error {
	buf := make([]byte, 4096)
	for {
		n, err := s.Read(buf)
		if n > 0 {
			if _, writeErr := w.Write(buf[:n]); writeErr != nil {
				return writeErr
			}
		}
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}
	}
}
