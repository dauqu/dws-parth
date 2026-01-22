//go:build windows

package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

const (
	STARTUP_KEY  = `Software\Microsoft\Windows\CurrentVersion\Run`
	STARTUP_NAME = "RemoteAdminAgent"
	DOWNLOAD_URL = "https://dws.daucu.com/dws-agent-new.exe"
	SERVICE_NAME = "RemoteAdminAgent"
	INSTALL_DIR  = "C:\\RemoteAdmin"
	EXE_NAME     = "dws-agent.exe"
)

var (
	kernel32          = windows.NewLazySystemDLL("kernel32.dll")
	procGetNativeArch = kernel32.NewProc("GetNativeSystemInfo")
)

func main() {
	// Check if running as administrator
	if !isAdmin() {
		// Try to re-launch with admin privileges
		if err := runAsAdmin(); err != nil {
			os.Exit(1)
		}
		// If successful, the new elevated process will run and this one will exit
		os.Exit(0)
	}

	// Start loading spinner in background
	spinChars := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
	done := make(chan bool)
	go func() {
		idx := 0
		for {
			select {
			case <-done:
				return
			default:
				fmt.Printf("\r%s ", spinChars[idx%len(spinChars)])
				idx++
				time.Sleep(80 * time.Millisecond)
			}
		}
	}()

	// Step 1: Clean existing installation directory
	if _, err := os.Stat(INSTALL_DIR); err == nil {
		// Directory exists, remove all files
		entries, _ := os.ReadDir(INSTALL_DIR)
		for _, entry := range entries {
			os.RemoveAll(filepath.Join(INSTALL_DIR, entry.Name()))
		}
	}

	// Step 2: Create installation directory
	if err := os.MkdirAll(INSTALL_DIR, 0755); err != nil {
		done <- true
		os.Exit(1)
	}

	// Step 3: Download agent with retry
	exePath := filepath.Join(INSTALL_DIR, EXE_NAME)

	maxRetries := 3
	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if attempt > 1 {
			time.Sleep(2 * time.Second) // Wait 2 seconds before retry
		}

		if err := downloadFileSilent(exePath, DOWNLOAD_URL); err != nil {
			lastErr = err
			continue
		}

		// Success!
		lastErr = nil
		break
	}

	if lastErr != nil {
		done <- true
		os.Exit(1)
	}

	// Step 4: Stop existing service if running (cleanup old installations)
	stopService()

	// Step 5: Remove existing service (cleanup old installations)
	removeService()

	// Step 6: Kill any running agent process
	killAgentProcess()

	// Step 7: Add to Windows Startup (runs in user session for screen access)
	if err := addToStartup(exePath); err != nil {
		done <- true
		os.Exit(1)
	}

	// Step 8: Start agent now
	startAgent(exePath)

	// Stop spinner
	done <- true
	time.Sleep(100 * time.Millisecond)
	fmt.Print("\r ") // Clear spinner
	time.Sleep(1 * time.Second)
}

type systemInfo struct {
	wProcessorArchitecture      uint16
	wReserved                   uint16
	dwPageSize                  uint32
	lpMinimumApplicationAddress uintptr
	lpMaximumApplicationAddress uintptr
	dwActiveProcessorMask       uintptr
	dwNumberOfProcessors        uint32
	dwProcessorType             uint32
	dwAllocationGranularity     uint32
	wProcessorLevel             uint16
	wProcessorRevision          uint16
}

const (
	PROCESSOR_ARCHITECTURE_AMD64 = 9
	PROCESSOR_ARCHITECTURE_ARM64 = 12
	PROCESSOR_ARCHITECTURE_INTEL = 0
	PROCESSOR_ARCHITECTURE_ARM   = 5
)

func getSystemArchitecture() string {
	var si systemInfo
	procGetNativeArch.Call(uintptr(unsafe.Pointer(&si)))

	switch si.wProcessorArchitecture {
	case PROCESSOR_ARCHITECTURE_AMD64:
		return "amd64"
	case PROCESSOR_ARCHITECTURE_ARM64:
		return "arm64"
	case PROCESSOR_ARCHITECTURE_INTEL:
		return "386"
	case PROCESSOR_ARCHITECTURE_ARM:
		return "arm"
	default:
		// Fallback: try to detect from environment
		if strings.Contains(strings.ToLower(os.Getenv("PROCESSOR_ARCHITECTURE")), "amd64") ||
			strings.Contains(strings.ToLower(os.Getenv("PROCESSOR_ARCHITEW6432")), "amd64") {
			return "amd64"
		}
		if strings.Contains(strings.ToLower(os.Getenv("PROCESSOR_ARCHITECTURE")), "arm64") {
			return "arm64"
		}
		// Default to 386 for unknown
		return "386"
	}
}

func detectArchitecture() string {
	arch := getSystemArchitecture()
	switch arch {
	case "amd64":
		return "AMD64 (64-bit Intel/AMD)"
	case "386":
		return "386 (32-bit Intel/AMD)"
	case "arm64":
		return "ARM64 (ARM-based Windows)"
	case "arm":
		return "ARM (32-bit ARM)"
	default:
		return "Unknown (" + arch + ")"
	}
}

func isAdmin() bool {
	var sid *windows.SID
	err := windows.AllocateAndInitializeSid(
		&windows.SECURITY_NT_AUTHORITY,
		2,
		windows.SECURITY_BUILTIN_DOMAIN_RID,
		windows.DOMAIN_ALIAS_RID_ADMINS,
		0, 0, 0, 0, 0, 0,
		&sid)
	if err != nil {
		return false
	}
	defer windows.FreeSid(sid)

	token := windows.Token(0)
	member, err := token.IsMember(sid)
	if err != nil {
		return false
	}
	return member
}

func downloadFile(filepath string, url string) error {
	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check server response
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status %d", resp.StatusCode)
	}

	// Write the body to file with progress
	total := resp.ContentLength
	downloaded := int64(0)
	buffer := make([]byte, 32*1024) // 32KB buffer

	spinChars := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
	spinIdx := 0

	for {
		n, err := resp.Body.Read(buffer)
		if n > 0 {
			_, werr := out.Write(buffer[:n])
			if werr != nil {
				return werr
			}
			downloaded += int64(n)
			if total > 0 {
				percent := float64(downloaded) / float64(total) * 100
				bars := int(percent / 2)
				fmt.Printf("\r   %s [%-50s] %.1f%% ", spinChars[spinIdx%len(spinChars)], strings.Repeat("█", bars)+strings.Repeat("░", 50-bars), percent)
				spinIdx++
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}
	fmt.Printf("\r   ✓ [%-50s] 100.0%% \n", strings.Repeat("█", 50))
	return nil
}

func downloadFileSilent(filepath string, url string) error {
	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check server response
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status %d", resp.StatusCode)
	}

	// Write the body to file silently
	_, err = io.Copy(out, resp.Body)
	return err
}

func runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func stopService() {
	runCommand("sc", "stop", SERVICE_NAME)
}

func removeService() {
	runCommand("sc", "delete", SERVICE_NAME)
}

func killAgentProcess() {
	// Kill any running dws-agent.exe process
	runCommand("taskkill", "/F", "/IM", EXE_NAME)
}

func removeOldStartup() {
	// Remove registry startup entry if exists
	key, err := registry.OpenKey(registry.CURRENT_USER, STARTUP_KEY, registry.SET_VALUE)
	if err == nil {
		key.DeleteValue(STARTUP_NAME)
		key.Close()
	}
	// Remove old scheduled task if exists
	runCommand("schtasks", "/Delete", "/TN", STARTUP_NAME, "/F")
}

func addToStartup(exePath string) error {
	// Remove any old startup entries first
	removeOldStartup()

	// Use Task Scheduler for more reliable startup with desktop access
	// Create a scheduled task that runs at user logon with a delay
	// The delay ensures the desktop is fully ready

	// Get current username
	username := os.Getenv("USERNAME")
	if username == "" {
		username = os.Getenv("USER")
	}

	// Create scheduled task using schtasks command
	// /SC ONLOGON - Run when user logs on
	// /DELAY 0000:30 - Wait 30 seconds after logon (ensures desktop is ready)
	// /RL HIGHEST - Run with highest privileges
	err := runCommand("schtasks", "/Create",
		"/TN", STARTUP_NAME,
		"/TR", fmt.Sprintf("\"%s\"", exePath),
		"/SC", "ONLOGON",
		"/DELAY", "0000:30",
		"/RL", "HIGHEST",
		"/F") // Force overwrite if exists

	if err != nil {
		// Fallback to registry startup if schtasks fails
		key, _, err := registry.CreateKey(registry.CURRENT_USER, STARTUP_KEY, registry.SET_VALUE)
		if err != nil {
			return err
		}
		defer key.Close()
		return key.SetStringValue(STARTUP_NAME, fmt.Sprintf("\"%s\"", exePath))
	}

	return nil
}

func startAgent(exePath string) error {
	cmd := exec.Command(exePath)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Start() // Start without waiting
}

func pause() {
	fmt.Println("\nPress Enter to exit...")
	fmt.Scanln()
}

func runAsAdmin() error {
	// Get current executable path
	exePath, err := os.Executable()
	if err != nil {
		return err
	}

	// Convert to UTF16 for Windows API
	verb := windows.StringToUTF16Ptr("runas")
	exe := windows.StringToUTF16Ptr(exePath)
	cwd := windows.StringToUTF16Ptr("")
	args := windows.StringToUTF16Ptr("")

	// ShellExecute to request elevation
	var showCmd int32 = 1 // SW_NORMAL

	err = windows.ShellExecute(0, verb, exe, args, cwd, showCmd)
	if err != nil {
		return err
	}

	return nil
}
