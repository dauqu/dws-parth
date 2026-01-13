//go:build !windows
// +build !windows

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type ShellSession struct {
	Type       string `json:"type"` // "bash", "zsh", "sh"
	WorkingDir string `json:"working_dir"`
	mu         sync.Mutex
	conpty     *ConPTYSession // Not used on Unix, kept for interface compatibility
	useConPTY  bool           // Always false on Unix
}

var shellSessions = make(map[string]*ShellSession)
var sessionMutex sync.RWMutex

func InitShellSession(sessionID, shellType string) {
	sessionMutex.Lock()
	defer sessionMutex.Unlock()

	// Get user's home directory as default
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "/"
	}

	// Default to bash on Unix if no shell type specified
	if shellType == "" || shellType == "powershell" || shellType == "cmd" {
		// Check for preferred shell
		shellType = detectDefaultShell()
	}

	session := &ShellSession{
		Type:       shellType,
		WorkingDir: homeDir,
		useConPTY:  false, // PTY not used in this implementation
	}

	log.Printf("Initializing shell session %s with type %s", sessionID, shellType)

	shellSessions[sessionID] = session
}

// detectDefaultShell detects the user's default shell
func detectDefaultShell() string {
	// Check SHELL environment variable
	shell := os.Getenv("SHELL")
	if shell != "" {
		base := filepath.Base(shell)
		if base == "zsh" || base == "bash" || base == "sh" {
			return base
		}
	}

	// Check if zsh exists
	if _, err := exec.LookPath("zsh"); err == nil {
		return "zsh"
	}

	// Check if bash exists
	if _, err := exec.LookPath("bash"); err == nil {
		return "bash"
	}

	// Fallback to sh
	return "sh"
}

func GetShellSession(sessionID string) *ShellSession {
	sessionMutex.RLock()
	defer sessionMutex.RUnlock()
	return shellSessions[sessionID]
}

// isCdCommand checks if the command is a directory change command
func isCdCommand(cmd string) bool {
	cmdLower := strings.ToLower(strings.TrimSpace(cmd))

	if strings.HasPrefix(cmdLower, "cd ") || cmdLower == "cd" {
		return true
	}
	if strings.HasPrefix(cmdLower, "pushd ") {
		return true
	}
	if cmdLower == "popd" {
		return true
	}

	return false
}

// extractTargetDir extracts the target directory from a cd command
func extractTargetDir(cmd string) string {
	cmdTrim := strings.TrimSpace(cmd)

	var targetDir string

	if strings.HasPrefix(strings.ToLower(cmdTrim), "cd ") {
		targetDir = strings.TrimSpace(cmdTrim[3:])
	} else if strings.HasPrefix(strings.ToLower(cmdTrim), "pushd ") {
		targetDir = strings.TrimSpace(cmdTrim[6:])
	}

	// Remove surrounding quotes
	targetDir = strings.Trim(targetDir, "\"'")

	// Handle ~ expansion
	if strings.HasPrefix(targetDir, "~") {
		homeDir, err := os.UserHomeDir()
		if err == nil {
			targetDir = strings.Replace(targetDir, "~", homeDir, 1)
		}
	}

	return targetDir
}

func HandleShellCommand(data json.RawMessage) Response {
	var req struct {
		SessionID string `json:"session_id"`
		ShellType string `json:"shell_type"` // "bash", "zsh", "sh"
		Command   string `json:"command"`
	}

	if err := json.Unmarshal(data, &req); err != nil {
		return Response{Success: false, Message: "Invalid shell command request"}
	}

	// Initialize session if doesn't exist
	session := GetShellSession(req.SessionID)
	if session == nil {
		InitShellSession(req.SessionID, req.ShellType)
		session = GetShellSession(req.SessionID)
	}

	// Update shell type if changed (map Windows types to Unix)
	if req.ShellType != "" && req.ShellType != session.Type {
		session.mu.Lock()
		if req.ShellType == "powershell" || req.ShellType == "cmd" {
			session.Type = detectDefaultShell()
		} else {
			session.Type = req.ShellType
		}
		session.mu.Unlock()
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	// Check if this is a cd command that we need to handle specially
	cmdTrimmed := strings.TrimSpace(req.Command)
	isChangeDir := isCdCommand(cmdTrimmed)

	// Build the actual command to execute
	var actualCommand string

	if isChangeDir {
		targetDir := extractTargetDir(cmdTrimmed)
		if targetDir == "" {
			// Just "cd" - go to home directory
			homeDir, _ := os.UserHomeDir()
			actualCommand = fmt.Sprintf("cd '%s' && pwd", homeDir)
		} else if targetDir == "-" {
			// cd - : go to previous directory
			actualCommand = "cd - && pwd"
		} else {
			actualCommand = fmt.Sprintf("cd '%s' && pwd", strings.ReplaceAll(targetDir, "'", "'\\''"))
		}
	} else {
		actualCommand = req.Command
	}

	// Determine the shell to use
	var shellPath string
	var shellArgs []string

	switch session.Type {
	case "zsh":
		shellPath = "/bin/zsh"
		shellArgs = []string{"-c", actualCommand}
	case "bash":
		shellPath = "/bin/bash"
		shellArgs = []string{"-c", actualCommand}
	default:
		shellPath = "/bin/sh"
		shellArgs = []string{"-c", actualCommand}
	}

	// Check if shell exists
	if _, err := os.Stat(shellPath); os.IsNotExist(err) {
		// Try to find in PATH
		resolved, err := exec.LookPath(session.Type)
		if err == nil {
			shellPath = resolved
		} else {
			shellPath = "/bin/sh" // Fallback
		}
	}

	// Execute command
	cmd := exec.Command(shellPath, shellArgs...)

	var output bytes.Buffer
	var stderr bytes.Buffer

	cmd.Dir = session.WorkingDir
	cmd.Stdout = &output
	cmd.Stderr = &stderr

	// Set environment
	cmd.Env = os.Environ()

	// Add timeout context
	done := make(chan error)
	go func() {
		done <- cmd.Run()
	}()

	var err error
	select {
	case err = <-done:
		// Command completed
	case <-time.After(30 * time.Second):
		// Timeout - kill the process
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		return Response{
			Success: false,
			Message: "Command timed out after 30 seconds",
		}
	}

	result := output.String()
	if stderr.Len() > 0 {
		result += "\n" + stderr.String()
	}

	// Update working directory if cd command was executed successfully
	if isChangeDir && err == nil {
		newDir := strings.TrimSpace(result)
		// The result contains the new path from pwd
		if newDir != "" && len(newDir) < 500 {
			// Verify it's a valid path
			if _, statErr := os.Stat(newDir); statErr == nil {
				session.WorkingDir = newDir
				// For cd commands, show the new directory as output
				result = newDir
			}
		}
	}

	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			result += "\nError: " + err.Error()
			exitCode = 1
		}
	}

	log.Printf("Shell command executed: %s [Type: %s, Exit: %d, CWD: %s]", req.Command, session.Type, exitCode, session.WorkingDir)

	return Response{
		Success: true,
		Message: "Command executed",
		Data: map[string]interface{}{
			"output":      result,
			"exit_code":   exitCode,
			"shell_type":  session.Type,
			"working_dir": session.WorkingDir,
		},
	}
}

func HandleSwitchShell(data json.RawMessage) Response {
	var req struct {
		SessionID string `json:"session_id"`
		ShellType string `json:"shell_type"` // "bash", "zsh", "sh"
	}

	if err := json.Unmarshal(data, &req); err != nil {
		return Response{Success: false, Message: "Invalid request"}
	}

	session := GetShellSession(req.SessionID)
	if session == nil {
		InitShellSession(req.SessionID, req.ShellType)
		session = GetShellSession(req.SessionID)
	}

	session.mu.Lock()
	oldType := session.Type

	// Map Windows shell types to Unix
	newType := req.ShellType
	if newType == "powershell" || newType == "cmd" {
		newType = detectDefaultShell()
	}

	session.Type = newType
	session.mu.Unlock()

	log.Printf("Switched shell from %s to %s", oldType, newType)

	return Response{
		Success: true,
		Message: fmt.Sprintf("Switched to %s", newType),
		Data: map[string]interface{}{
			"shell_type":  session.Type,
			"working_dir": session.WorkingDir,
		},
	}
}
