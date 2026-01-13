//go:build !windows
// +build !windows

package main

import (
	"encoding/json"
	"fmt"
)

type ServiceInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Status      string `json:"status"`
	StartType   string `json:"start_type"`
}

type ServiceOperation struct {
	Action      string `json:"action"`
	ServiceName string `json:"service_name,omitempty"`
}

type ServiceResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ListServices returns an empty list on non-Windows platforms
func ListServices() ([]ServiceInfo, error) {
	return nil, fmt.Errorf("service management not supported on this platform")
}

// StartService is not supported on non-Windows platforms
func StartService(serviceName string) error {
	return fmt.Errorf("service management not supported on this platform")
}

// StopService is not supported on non-Windows platforms
func StopService(serviceName string) error {
	return fmt.Errorf("service management not supported on this platform")
}

// RestartService is not supported on non-Windows platforms
func RestartService(serviceName string) error {
	return fmt.Errorf("service management not supported on this platform")
}

// PauseService is not supported on non-Windows platforms
func PauseService(serviceName string) error {
	return fmt.Errorf("service management not supported on this platform")
}

// ResumeService is not supported on non-Windows platforms
func ResumeService(serviceName string) error {
	return fmt.Errorf("service management not supported on this platform")
}

// EnableService is not supported on non-Windows platforms
func EnableService(serviceName string) error {
	return fmt.Errorf("service management not supported on this platform")
}

// DisableService is not supported on non-Windows platforms
func DisableService(serviceName string) error {
	return fmt.Errorf("service management not supported on this platform")
}

// HandleServiceOperation handles service operations on non-Windows platforms
func HandleServiceOperation(op ServiceOperation) ServiceResponse {
	return ServiceResponse{
		Success: false,
		Message: "Service management is only available on Windows",
	}
}

// HandleServiceOperationJSON handles service operations from JSON
func HandleServiceOperationJSON(data []byte) ([]byte, error) {
	var op ServiceOperation
	if err := json.Unmarshal(data, &op); err != nil {
		return nil, err
	}

	response := HandleServiceOperation(op)
	return json.Marshal(response)
}
