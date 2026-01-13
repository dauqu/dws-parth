//go:build windows
// +build windows

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"time"
)

// HandleShellCommandConPTY handles shell commands using ConPTY for better terminal emulation
func HandleShellCommandConPTY(session *ShellSession, command string) Response {
	// Create ConPTY session if not exists
	if session.conpty == nil {
		pty, err := CreateConPTY(120, 30) // Default terminal size
		if err != nil {
			log.Printf("Failed to create ConPTY: %v, falling back to exec.Command", err)
			session.useConPTY = false
			return Response{Success: false, Message: fmt.Sprintf("ConPTY failed: %v", err)}
		}
		session.conpty = pty

		// Start shell process in ConPTY
		var shellCmd string
		var args []string

		if session.Type == "powershell" {
			shellCmd = "powershell.exe"
			args = []string{"-NoLogo", "-NoExit"}
		} else {
			shellCmd = "cmd.exe"
			args = []string{"/Q"} // Quiet mode, no version info
		}

		err = session.conpty.StartProcess(shellCmd, args)
		if err != nil {
			session.conpty.Close()
			session.conpty = nil
			session.useConPTY = false
			return Response{Success: false, Message: fmt.Sprintf("Failed to start shell: %v", err)}
		}

		log.Printf("Started %s in ConPTY session", shellCmd)

		// Wait for shell to initialize
		time.Sleep(500 * time.Millisecond)

		// Drain any initial output (welcome message, prompt, etc.)
		buf := make([]byte, 8192)
		for {
			session.conpty.Read(buf)
			// Just drain, don't wait too long
			time.Sleep(50 * time.Millisecond)
			break
		}

		// Change to working directory after shell has started
		if session.WorkingDir != "" {
			if session.Type == "powershell" {
				// PowerShell: Set-Location
				cdCmd := fmt.Sprintf("Set-Location '%s'\n", strings.ReplaceAll(session.WorkingDir, "'", "''"))
				session.conpty.Write([]byte(cdCmd))
			} else {
				// CMD: cd /d
				cdCmd := fmt.Sprintf("cd /d \"%s\"\n", session.WorkingDir)
				session.conpty.Write([]byte(cdCmd))
			}
			// Wait for cd to complete and drain output
			time.Sleep(200 * time.Millisecond)
			session.conpty.Read(buf)
		}
	}

	// Send command to ConPTY
	cmdBytes := []byte(command + "\n")
	_, err := session.conpty.Write(cmdBytes)
	if err != nil {
		log.Printf("Failed to write to ConPTY: %v", err)
		return Response{Success: false, Message: fmt.Sprintf("Failed to send command: %v", err)}
	}

	// Read output with timeout
	var output bytes.Buffer
	done := make(chan bool)
	errChan := make(chan error)

	go func() {
		buf := make([]byte, 4096)
		timeout := time.After(10 * time.Second)            // 10 second timeout for command output
		readTimer := time.NewTimer(200 * time.Millisecond) // Wait 200ms for output

		for {
			select {
			case <-timeout:
				errChan <- fmt.Errorf("command timeout")
				return
			case <-readTimer.C:
				// If no output for 200ms, consider command complete
				done <- true
				return
			default:
				// Try to read with a very short deadline
				n, err := session.conpty.Read(buf)
				if n > 0 {
					output.Write(buf[:n])
					readTimer.Reset(200 * time.Millisecond) // Reset timer on new data
				}
				if err != nil {
					if err != io.EOF {
						errChan <- err
						return
					}
					done <- true
					return
				}
			}
		}
	}()

	// Wait for output or error
	select {
	case <-done:
		// Command completed successfully
	case err := <-errChan:
		log.Printf("Error reading ConPTY output: %v", err)
		return Response{
			Success: false,
			Message: fmt.Sprintf("Error reading output: %v", err),
		}
	}

	outputStr := output.String()

	// Try to extract working directory from output if needed
	// For PowerShell: parse "PS C:\path>" prompt
	// For CMD: parse "C:\path>" prompt
	// This is approximate since ConPTY returns raw VT sequences

	return Response{
		Success: true,
		Message: "Command executed via ConPTY",
		Data: map[string]interface{}{
			"output":      outputStr,
			"exit_code":   0, // ConPTY doesn't provide individual command exit codes
			"shell_type":  session.Type,
			"working_dir": session.WorkingDir,
			"vt_enabled":  true, // Indicate VT sequences are in output
		},
	}
}

// HandleShellResize handles terminal resize requests for ConPTY sessions
func HandleShellResize(data json.RawMessage) Response {
	var req struct {
		SessionID string `json:"session_id"`
		Cols      int16  `json:"cols"`
		Rows      int16  `json:"rows"`
	}

	if err := json.Unmarshal(data, &req); err != nil {
		return Response{Success: false, Message: "Invalid resize request"}
	}

	session := GetShellSession(req.SessionID)
	if session == nil {
		return Response{Success: false, Message: "Session not found"}
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	if session.conpty != nil {
		err := session.conpty.Resize(req.Cols, req.Rows)
		if err != nil {
			return Response{Success: false, Message: fmt.Sprintf("Failed to resize: %v", err)}
		}

		log.Printf("Resized ConPTY session %s to %dx%d", req.SessionID, req.Cols, req.Rows)

		return Response{
			Success: true,
			Message: "Terminal resized",
			Data: map[string]interface{}{
				"cols": req.Cols,
				"rows": req.Rows,
			},
		}
	}

	return Response{Success: false, Message: "ConPTY session not active"}
}

// CloseShellSession closes a shell session and cleans up ConPTY resources
func CloseShellSession(sessionID string) {
	sessionMutex.Lock()
	defer sessionMutex.Unlock()

	if session, ok := shellSessions[sessionID]; ok {
		if session.conpty != nil {
			session.conpty.Close()
		}
		delete(shellSessions, sessionID)
		log.Printf("Closed shell session: %s", sessionID)
	}
}
