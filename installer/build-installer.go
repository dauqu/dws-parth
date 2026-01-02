package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

const (
	innoSetupPath = `C:\Program Files (x86)\Inno Setup 6\ISCC.exe`
	agentExePath  = `..\bin\dws-agent.exe`
	agentBuildDir = `..\agent`
	setupScript   = `setup.iss`
	assetsDir     = `..\assets`
)

func main() {
	fmt.Println("========================================")
	fmt.Println("Building Remote Admin Agent Installer")
	fmt.Println("========================================")
	fmt.Println()

	// Check if Inno Setup is installed
	if !fileExists(innoSetupPath) {
		fmt.Println("ERROR: Inno Setup not found!")
		fmt.Println("Please install Inno Setup from: https://jrsoftware.org/isdl.php")
		fmt.Println()
		fmt.Println("Installation steps:")
		fmt.Println("1. Download Inno Setup from https://jrsoftware.org/isdl.php")
		fmt.Println("2. Install it to the default location")
		fmt.Println("3. Run this program again")
		pause()
		os.Exit(1)
	}

	// Check if agent.exe exists, build if needed
	if !fileExists(agentExePath) {
		fmt.Println("ERROR: dws-agent.exe not found!")
		fmt.Println("Building agent...")

		if err := buildAgent(); err != nil {
			fmt.Printf("Failed to build agent: %v\n", err)
			pause()
			os.Exit(1)
		}

		if !fileExists(agentExePath) {
			fmt.Println("Failed to build agent!")
			pause()
			os.Exit(1)
		}
	}

	// Create assets directory if it doesn't exist
	if err := os.MkdirAll(assetsDir, 0755); err != nil {
		fmt.Printf("Warning: Could not create assets directory: %v\n", err)
	}

	// Check for icon
	iconPath := filepath.Join(assetsDir, "icon.ico")
	if !fileExists(iconPath) {
		fmt.Println("Note: No custom icon found at assets\\icon.ico")
		fmt.Println("You can add a custom icon for better branding")
		fmt.Println()
	}

	// Build the installer
	fmt.Println("Compiling installer...")
	if err := buildInstaller(); err != nil {
		fmt.Printf("ERROR: Failed to build installer: %v\n", err)
		pause()
		os.Exit(1)
	}

	fmt.Println()
	fmt.Println("========================================")
	fmt.Println("SUCCESS!")
	fmt.Println("========================================")
	fmt.Println("Installer created: ..\\bin\\RemoteAdminAgent-Setup.exe")
	fmt.Println()
	fmt.Println("You can now distribute this installer to install the agent on any Windows computer.")
	fmt.Println("The agent will run as a Windows service and start automatically on boot.")
	fmt.Println()

	pause()
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func buildAgent() error {
	cmd := exec.Command("go", "build", "-ldflags=-H windowsgui", "-o", agentExePath, ".")
	cmd.Dir = agentBuildDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func buildInstaller() error {
	cmd := exec.Command(innoSetupPath, setupScript)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func pause() {
	fmt.Println("Press Enter to continue...")
	fmt.Scanln()
}
