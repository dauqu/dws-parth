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
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	DOWNLOAD_BASE_URL = "https://dws.daucu.com/agents"
	SERVICE_NAME      = "RemoteAdminAgent"
	INSTALL_DIR       = "C:\\Program Files\\RemoteAdmin"
	EXE_NAME          = "dws-agent.exe"
)

var (
	kernel32           = windows.NewLazySystemDLL("kernel32.dll")
	procGetNativeArch  = kernel32.NewProc("GetNativeSystemInfo")
)

func main() {
	// Check if running as administrator
	if !isAdmin() {
		fmt.Println("⚠️  This installer requires Administrator privileges!")
		fmt.Println("Please run as Administrator...")
		fmt.Println("\nPress Enter to exit...")
		fmt.Scanln()
		os.Exit(1)
	}

	fmt.Println("╔════════════════════════════════════════╗")
	fmt.Println("║   Remote Admin Agent Installer        ║")
	fmt.Println("╚════════════════════════════════════════╝")
	fmt.Println()

	// Detect system architecture
	arch := detectArchitecture()
	fmt.Printf("🔍 Detected Architecture: %s\n", arch)
	fmt.Println()

	// Step 1: Create installation directory
	fmt.Println("📁 Creating installation directory...")
	if err := os.MkdirAll(INSTALL_DIR, 0755); err != nil {
		fmt.Printf("❌ Failed to create directory: %v\n", err)
		pause()
		os.Exit(1)
	}
	fmt.Println("✅ Directory created")

	// Step 2: Download agent for detected architecture
	exePath := filepath.Join(INSTALL_DIR, EXE_NAME)
	downloadURL := getDownloadURL(arch)
	fmt.Printf("\n⬇️  Downloading %s agent...\n", arch)
	fmt.Printf("   From: %s\n", downloadURL)
	if err := downloadFile(exePath, downloadURL); err != nil {
		fmt.Printf("❌ Download failed: %v\n", err)
		fmt.Println("\n💡 Tip: Make sure the agent files are uploaded to your server:")
		fmt.Printf("   %s/dws-agent-amd64.exe\n", DOWNLOAD_BASE_URL)
		fmt.Printf("   %s/dws-agent-386.exe\n", DOWNLOAD_BASE_URL)
		fmt.Printf("   %s/dws-agent-arm64.exe\n", DOWNLOAD_BASE_URL)
		pause()
		os.Exit(1)
	}
	fmt.Println("✅ Download complete")

	// Step 3: Stop existing service if running
	fmt.Println("\n🛑 Stopping existing service (if any)...")
	stopService()

	// Step 4: Remove existing service
	fmt.Println("🗑️  Removing existing service (if any)...")
	removeService()

	// Step 5: Install as Windows Service
	fmt.Println("\n⚙️  Installing Windows Service...")
	if err := installService(exePath); err != nil {
		fmt.Printf("❌ Service installation failed: %v\n", err)
		pause()
		os.Exit(1)
	}
	fmt.Println("✅ Service installed")

	// Step 6: Configure service
	fmt.Println("\n🔧 Configuring service...")
	configureService()
	fmt.Println("✅ Service configured")

	// Step 7: Start service
	fmt.Println("\n▶️  Starting service...")
	if err := startService(); err != nil {
		fmt.Printf("⚠️  Warning: Failed to start service: %v\n", err)
		fmt.Println("You can start it manually from Services (services.msc)")
	} else {
		fmt.Println("✅ Service started successfully")
	}

	fmt.Println("\n╔════════════════════════════════════════╗")
	fmt.Println("║     Installation Complete! ✅          ║")
	fmt.Println("╚════════════════════════════════════════╝")
	fmt.Println()
	fmt.Printf("Service Name: %s\n", SERVICE_NAME)
	fmt.Printf("Install Path: %s\n", exePath)
	fmt.Println()
	fmt.Println("The agent is now running in the background.")
	fmt.Println("\nPress Enter to exit...")
	fmt.Scanln()
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

func getDownloadURL(archDisplay string) string {
	arch := getSystemArchitecture()
	switch arch {
	case "amd64":
		return fmt.Sprintf("%s/dws-agent-amd64.exe", DOWNLOAD_BASE_URL)
	case "386":
		return fmt.Sprintf("%s/dws-agent-386.exe", DOWNLOAD_BASE_URL)
	case "arm64":
		return fmt.Sprintf("%s/dws-agent-arm64.exe", DOWNLOAD_BASE_URL)
	case "arm":
		// 32-bit ARM - use ARM64 agent (might work via emulation)
		return fmt.Sprintf("%s/dws-agent-arm64.exe", DOWNLOAD_BASE_URL)
	default:
		// Fallback to AMD64
		return fmt.Sprintf("%s/dws-agent-amd64.exe", DOWNLOAD_BASE_URL)
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
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	// Write the body to file with progress
	total := resp.ContentLength
	downloaded := int64(0)
	buffer := make([]byte, 32*1024) // 32KB buffer

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
				fmt.Printf("\r   Progress: %.1f%% (%d / %d bytes)", percent, downloaded, total)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}
	fmt.Println()
	return nil
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

func installService(exePath string) error {
	cmd := exec.Command("sc", "create", SERVICE_NAME,
		"binPath=", fmt.Sprintf("\"%s\"", exePath),
		"DisplayName=", "Remote Admin Agent",
		"start=", "auto")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func configureService() {
	// Set description
	runCommand("sc", "description", SERVICE_NAME, "Remote administration agent for system management")

	// Set recovery options - restart on failure
	runCommand("sc", "failure", SERVICE_NAME,
		"reset=", "86400",
		"actions=", "restart/60000/restart/60000/restart/60000")
}

func startService() error {
	cmd := exec.Command("sc", "start", SERVICE_NAME)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func pause() {
	fmt.Println("\nPress Enter to exit...")
	fmt.Scanln()
}
