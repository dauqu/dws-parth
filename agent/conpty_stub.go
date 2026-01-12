//go:build !windows
// +build !windows

package main

import (
	"fmt"
	"io"
)

// ConPTYSession stub for non-Windows platforms
type ConPTYSession struct{}

// IsConPTYAvailable always returns false on non-Windows platforms
func IsConPTYAvailable() bool {
	return false
}

// CreateConPTY returns an error on non-Windows platforms
func CreateConPTY(cols, rows int16) (*ConPTYSession, error) {
	return nil, fmt.Errorf("ConPTY is only available on Windows")
}

// Resize stub
func (s *ConPTYSession) Resize(cols, rows int16) error {
	return fmt.Errorf("ConPTY is only available on Windows")
}

// Write stub
func (s *ConPTYSession) Write(data []byte) (int, error) {
	return 0, fmt.Errorf("ConPTY is only available on Windows")
}

// Read stub
func (s *ConPTYSession) Read(buf []byte) (int, error) {
	return 0, fmt.Errorf("ConPTY is only available on Windows")
}

// StartProcess stub
func (s *ConPTYSession) StartProcess(command string, args []string) error {
	return fmt.Errorf("ConPTY is only available on Windows")
}

// Wait stub
func (s *ConPTYSession) Wait() error {
	return fmt.Errorf("ConPTY is only available on Windows")
}

// Close stub
func (s *ConPTYSession) Close() error {
	return nil
}

// CopyOutput stub
func (s *ConPTYSession) CopyOutput(w io.Writer) error {
	return fmt.Errorf("ConPTY is only available on Windows")
}
