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
	Action      string `json:"action"` // list, start, stop, enable, disable
	ServiceName string `json:"service_name,omitempty"`
}

type ServiceResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ListServices returns empty list on Linux (services managed by systemd)
func ListServices() ([]ServiceInfo, error) {
	return []ServiceInfo{}, nil
}

// StartService is not supported on Linux
func StartService(serviceName string) error {
	return fmt.Errorf("service management not supported on Linux. Use: systemctl start %s", serviceName)
}

// StopService is not supported on Linux
func StopService(serviceName string) error {
	return fmt.Errorf("service management not supported on Linux. Use: systemctl stop %s", serviceName)
}

// RestartService is not supported on Linux
func RestartService(serviceName string) error {
	return fmt.Errorf("service management not supported on Linux. Use: systemctl restart %s", serviceName)
}

// EnableService is not supported on Linux
func EnableService(serviceName string) error {
	return fmt.Errorf("service management not supported on Linux. Use: systemctl enable %s", serviceName)
}

// DisableService is not supported on Linux
func DisableService(serviceName string) error {
	return fmt.Errorf("service management not supported on Linux. Use: systemctl disable %s", serviceName)
}

// HandleServiceOperation handles service operations (returns error on Linux)
func HandleServiceOperation(op ServiceOperation) ServiceResponse {
	return ServiceResponse{
		Success: false,
		Message: fmt.Sprintf("Service management not supported on Linux. Use 'systemctl %s %s'", op.Action, op.ServiceName),
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
