//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

const (
	SERVICE_NAME = "RemoteAdminAgent"
	INSTALL_DIR  = "C:\\Program Files\\RemoteAdmin"
	EXE_NAME     = "dws-agent.exe"
)

// ---------------------------
// Admin check
// ---------------------------
func isAdmin() bool {
	token := windows.GetCurrentProcessToken()
	defer token.Close()

	var elevation uint32
	var retLen uint32
	err := windows.GetTokenInformation(token, windows.TokenElevation, (*byte)(unsafe.Pointer(&elevation)), 4, &retLen)
	return err == nil && elevation != 0
}

// ---------------------------
// Elevate self
// ---------------------------
func runAsAdmin() error {
	exe, _ := os.Executable()
	return windows.ShellExecute(
		0,
		windows.StringToUTF16Ptr("runas"),
		windows.StringToUTF16Ptr(exe),
		nil,
		nil,
		windows.SW_HIDE,
	)
}

// ---------------------------
// Kill process by name and wait
// ---------------------------
func killProcessByName(name string) error {
	cmd := exec.Command("taskkill", "/F", "/T", "/IM", name)
	err := cmd.Run()
	// Wait a bit for process to fully terminate
	time.Sleep(1 * time.Second)
	return err
}

// ---------------------------
// Stop and remove Windows service
// ---------------------------
func removeService(serviceName string) error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		// Service doesn't exist, that's fine
		fmt.Printf("Service '%s' not found (may already be removed)\n", serviceName)
		return nil
	}
	defer s.Close()

	// Stop service if running and wait for it to stop
	status, err := s.Query()
	if err == nil && status.State != svc.Stopped {
		fmt.Println("Stopping service...")
		_, err = s.Control(svc.Stop)
		if err != nil {
			fmt.Printf("Warning: Failed to send stop signal: %v\n", err)
		}

		// Wait for service to stop (up to 30 seconds)
		for i := 0; i < 30; i++ {
			time.Sleep(1 * time.Second)
			status, err = s.Query()
			if err != nil {
				break
			}
			if status.State == svc.Stopped {
				fmt.Println("Service stopped")
				break
			}
			fmt.Printf("Waiting for service to stop... (%d/30)\n", i+1)
		}
	}

	// Extra delay to ensure file handles are released
	time.Sleep(2 * time.Second)

	// Delete the service
	err = s.Delete()
	if err != nil {
		return fmt.Errorf("failed to delete service: %v", err)
	}
	fmt.Println("Service removed")

	return nil
}

// ---------------------------
// Remove startup shortcut
// ---------------------------
func removeStartup() {
	startup := filepath.Join(os.Getenv("APPDATA"), "Microsoft", "Windows", "Start Menu", "Programs", "Startup")
	// Try common shortcut names
	shortcuts := []string{"RemoteAdmin.lnk", "RemoteAdminAgent.lnk", "DWSAgent.lnk", "dws-agent.lnk"}
	for _, name := range shortcuts {
		shortcut := filepath.Join(startup, name)
		if _, err := os.Stat(shortcut); err == nil {
			if err := os.Remove(shortcut); err != nil {
				fmt.Printf("Warning: Failed to remove startup shortcut %s: %v\n", name, err)
			} else {
				fmt.Printf("Removed startup shortcut: %s\n", name)
			}
		}
	}
}

// ---------------------------
// Remove installed files and directory
// ---------------------------
func removeInstallation() error {
	// Remove the EXE file
	exePath := filepath.Join(INSTALL_DIR, EXE_NAME)

	// Try to remove with retries (file might still be locked briefly)
	for i := 0; i < 5; i++ {
		if _, err := os.Stat(exePath); os.IsNotExist(err) {
			fmt.Println("Executable already removed")
			break
		}

		err := os.Remove(exePath)
		if err == nil {
			fmt.Println("Removed executable:", exePath)
			break
		}

		if i < 4 {
			fmt.Printf("Retrying file removal (%d/5)...\n", i+1)
			time.Sleep(2 * time.Second)
		} else {
			fmt.Printf("Warning: Could not remove %s: %v\n", exePath, err)
		}
	}

	// Try to remove the installation directory
	if _, err := os.Stat(INSTALL_DIR); err == nil {
		err := os.RemoveAll(INSTALL_DIR)
		if err != nil {
			fmt.Printf("Warning: Could not remove directory %s: %v\n", INSTALL_DIR, err)
		} else {
			fmt.Println("Removed installation directory:", INSTALL_DIR)
		}
	}

	// Also check legacy location (ProgramData)
	legacyPath := filepath.Join(os.Getenv("ProgramData"), "dws-agent.exe")
	if _, err := os.Stat(legacyPath); err == nil {
		if err := os.Remove(legacyPath); err != nil {
			fmt.Printf("Warning: Could not remove legacy file %s: %v\n", legacyPath, err)
		} else {
			fmt.Println("Removed legacy file:", legacyPath)
		}
	}

	return nil
}

// ---------------------------
// Main
// ---------------------------
func main() {
	fmt.Println("╔════════════════════════════════════════╗")
	fmt.Println("║   Remote Admin Agent Uninstaller      ║")
	fmt.Println("╚════════════════════════════════════════╝")
	fmt.Println()

	// Elevate if not admin
	if !isAdmin() {
		fmt.Println("Requesting Administrator privileges...")
		if err := runAsAdmin(); err != nil {
			fmt.Println("ERROR: Failed to elevate privileges:", err)
			pause()
		}
		return
	}

	fmt.Println("🛑 Uninstalling agent...")
	fmt.Println()

	// 1️⃣ Kill any running process first
	fmt.Println("Step 1: Terminating running processes...")
	processName := EXE_NAME
	killProcessByName(processName)

	// 2️⃣ Stop and remove service
	fmt.Println("\nStep 2: Removing Windows service...")
	if err := removeService(SERVICE_NAME); err != nil {
		fmt.Printf("Warning: %v\n", err)
	}

	// Also try legacy service name
	legacyService := "DWSAgentService"
	removeService(legacyService)

	// 3️⃣ Remove startup shortcuts
	fmt.Println("\nStep 3: Removing startup entries...")
	removeStartup()

	// 4️⃣ Remove installed files
	fmt.Println("\nStep 4: Removing installed files...")
	removeInstallation()

	fmt.Println()
	fmt.Println("╔════════════════════════════════════════╗")
	fmt.Println("║     Uninstall Complete! ✅            ║")
	fmt.Println("╚════════════════════════════════════════╝")
	fmt.Println()

	pause()
}

func pause() {
	fmt.Println("Press Enter to exit...")
	fmt.Scanln()
}
