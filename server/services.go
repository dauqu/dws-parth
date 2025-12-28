package main

import (
	"encoding/json"
	"fmt"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
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

func ListServices() ([]ServiceInfo, error) {
	m, err := mgr.Connect()
	if err != nil {
		return nil, err
	}
	defer m.Disconnect()

	services, err := m.ListServices()
	if err != nil {
		return nil, err
	}

	var serviceList []ServiceInfo
	for _, serviceName := range services {
		s, err := m.OpenService(serviceName)
		if err != nil {
			continue
		}

		status, err := s.Query()
		if err != nil {
			s.Close()
			continue
		}

		config, err := s.Config()
		if err != nil {
			s.Close()
			continue
		}

		serviceList = append(serviceList, ServiceInfo{
			Name:        serviceName,
			DisplayName: config.DisplayName,
			Status:      getStatusString(status.State),
			StartType:   getStartTypeString(config.StartType),
		})

		s.Close()
	}

	return serviceList, nil
}

func getStatusString(state svc.State) string {
	switch state {
	case svc.Stopped:
		return "Stopped"
	case svc.StartPending:
		return "Starting"
	case svc.StopPending:
		return "Stopping"
	case svc.Running:
		return "Running"
	case svc.ContinuePending:
		return "Continuing"
	case svc.PausePending:
		return "Pausing"
	case svc.Paused:
		return "Paused"
	default:
		return "Unknown"
	}
}

func getStartTypeString(startType uint32) string {
	switch startType {
	case windows.SERVICE_AUTO_START:
		return "Automatic"
	case windows.SERVICE_BOOT_START:
		return "Boot"
	case windows.SERVICE_DEMAND_START:
		return "Manual"
	case windows.SERVICE_DISABLED:
		return "Disabled"
	case windows.SERVICE_SYSTEM_START:
		return "System"
	default:
		return "Unknown"
	}
}

func StartService(serviceName string) error {
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		return err
	}
	defer s.Close()

	return s.Start()
}

func StopService(serviceName string) error {
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		return err
	}
	defer s.Close()

	status, err := s.Control(svc.Stop)
	if err != nil {
		return err
	}

	_ = status
	return nil
}

func RestartService(serviceName string) error {
	// First stop the service
	if err := StopService(serviceName); err != nil {
		return err
	}

	// Wait a bit for the service to fully stop
	// (In production, you'd want to poll the service status)
	// For now, a simple delay
	// time.Sleep(2 * time.Second)

	// Then start it again
	return StartService(serviceName)
}

func EnableService(serviceName string) error {
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		return err
	}
	defer s.Close()

	config, err := s.Config()
	if err != nil {
		return err
	}

	config.StartType = windows.SERVICE_AUTO_START
	return s.UpdateConfig(config)
}

func DisableService(serviceName string) error {
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		return err
	}
	defer s.Close()

	config, err := s.Config()
	if err != nil {
		return err
	}

	config.StartType = windows.SERVICE_DISABLED
	return s.UpdateConfig(config)
}

func HandleServiceOperation(op ServiceOperation) ServiceResponse {
	switch op.Action {
	case "list":
		services, err := ListServices()
		if err != nil {
			return ServiceResponse{Success: false, Message: err.Error()}
		}
		return ServiceResponse{Success: true, Message: "Services listed successfully", Data: services}

	case "start":
		err := StartService(op.ServiceName)
		if err != nil {
			return ServiceResponse{Success: false, Message: err.Error()}
		}
		return ServiceResponse{Success: true, Message: fmt.Sprintf("Service %s started successfully", op.ServiceName)}

	case "stop":
		err := StopService(op.ServiceName)
		if err != nil {
			return ServiceResponse{Success: false, Message: err.Error()}
		}
		return ServiceResponse{Success: true, Message: fmt.Sprintf("Service %s stopped successfully", op.ServiceName)}

	case "restart":
		err := RestartService(op.ServiceName)
		if err != nil {
			return ServiceResponse{Success: false, Message: err.Error()}
		}
		return ServiceResponse{Success: true, Message: fmt.Sprintf("Service %s restarted successfully", op.ServiceName)}

	case "enable":
		err := EnableService(op.ServiceName)
		if err != nil {
			return ServiceResponse{Success: false, Message: err.Error()}
		}
		return ServiceResponse{Success: true, Message: fmt.Sprintf("Service %s enabled successfully", op.ServiceName)}

	case "disable":
		err := DisableService(op.ServiceName)
		if err != nil {
			return ServiceResponse{Success: false, Message: err.Error()}
		}
		return ServiceResponse{Success: true, Message: fmt.Sprintf("Service %s disabled successfully", op.ServiceName)}

	default:
		return ServiceResponse{Success: false, Message: "Unknown action"}
	}
}

func HandleServiceOperationJSON(data []byte) ([]byte, error) {
	var op ServiceOperation
	if err := json.Unmarshal(data, &op); err != nil {
		return nil, err
	}

	response := HandleServiceOperation(op)
	return json.Marshal(response)
}
