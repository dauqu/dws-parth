package main

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

type SoftwareInfo struct {
	Name      string `json:"name"`
	Version   string `json:"version"`
	Publisher string `json:"publisher"`
	ID        string `json:"id"`
}

type SoftwareOperation struct {
	Action      string `json:"action"` // list, install, uninstall, search
	PackageName string `json:"package_name,omitempty"`
	PackageID   string `json:"package_id,omitempty"`
}

type SoftwareResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ListInstalledSoftware lists installed software using winget
func ListInstalledSoftware() ([]SoftwareInfo, error) {
	cmd := exec.Command("winget", "list")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to list software: %v", err)
	}

	return parseSoftwareList(string(output)), nil
}

// SearchSoftware searches for available software
func SearchSoftware(query string) ([]SoftwareInfo, error) {
	cmd := exec.Command("winget", "search", query)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to search software: %v", err)
	}

	return parseSoftwareList(string(output)), nil
}

// InstallSoftware installs software using winget
func InstallSoftware(packageID string) error {
	cmd := exec.Command("winget", "install", "--id", packageID, "--accept-package-agreements", "--accept-source-agreements", "-h")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("installation failed: %v\nOutput: %s", err, string(output))
	}
	return nil
}

// UninstallSoftware uninstalls software using winget
func UninstallSoftware(packageID string) error {
	cmd := exec.Command("winget", "uninstall", "--id", packageID, "-h")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("uninstallation failed: %v\nOutput: %s", err, string(output))
	}
	return nil
}

// parseSoftwareList parses winget output into structured data
func parseSoftwareList(output string) []SoftwareInfo {
	var software []SoftwareInfo
	lines := strings.Split(output, "\n")

	// Skip header lines (usually first 2 lines)
	dataStarted := false
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "-") {
			dataStarted = true
			continue
		}
		if !dataStarted || strings.HasPrefix(line, "Name") {
			continue
		}

		// Parse line - format varies but generally: Name  ID  Version
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			info := SoftwareInfo{
				Name: strings.Join(parts[0:len(parts)-2], " "),
			}
			if len(parts) >= 3 {
				info.Version = parts[len(parts)-2]
				info.ID = parts[len(parts)-1]
			} else if len(parts) == 2 {
				info.ID = parts[len(parts)-1]
			}
			if info.Name != "" {
				software = append(software, info)
			}
		}
	}

	return software
}

// HandleSoftwareOperation processes software management commands
func HandleSoftwareOperation(op SoftwareOperation) SoftwareResponse {
	switch op.Action {
	case "list":
		software, err := ListInstalledSoftware()
		if err != nil {
			return SoftwareResponse{Success: false, Message: err.Error()}
		}
		return SoftwareResponse{Success: true, Message: "Software listed successfully", Data: software}

	case "search":
		if op.PackageName == "" {
			return SoftwareResponse{Success: false, Message: "Package name is required for search"}
		}
		software, err := SearchSoftware(op.PackageName)
		if err != nil {
			return SoftwareResponse{Success: false, Message: err.Error()}
		}
		return SoftwareResponse{Success: true, Message: "Search completed", Data: software}

	case "install":
		if op.PackageID == "" {
			return SoftwareResponse{Success: false, Message: "Package ID is required for installation"}
		}
		err := InstallSoftware(op.PackageID)
		if err != nil {
			return SoftwareResponse{Success: false, Message: err.Error()}
		}
		return SoftwareResponse{Success: true, Message: fmt.Sprintf("Package %s installed successfully", op.PackageID)}

	case "uninstall":
		if op.PackageID == "" {
			return SoftwareResponse{Success: false, Message: "Package ID is required for uninstallation"}
		}
		err := UninstallSoftware(op.PackageID)
		if err != nil {
			return SoftwareResponse{Success: false, Message: err.Error()}
		}
		return SoftwareResponse{Success: true, Message: fmt.Sprintf("Package %s uninstalled successfully", op.PackageID)}

	default:
		return SoftwareResponse{Success: false, Message: "Unknown action"}
	}
}

func HandleSoftwareOperationJSON(data []byte) ([]byte, error) {
	var op SoftwareOperation
	if err := json.Unmarshal(data, &op); err != nil {
		return nil, err
	}

	response := HandleSoftwareOperation(op)
	return json.Marshal(response)
}
