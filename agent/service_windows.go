//go:build windows
// +build windows

package main

import (
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/sys/windows/svc"
)

// Windows Service implementation
type agentService struct {
	agent *Agent
}

func (s *agentService) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (ssec bool, errno uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown
	changes <- svc.Status{State: svc.StartPending}

	// Channel to signal shutdown
	stopChan := make(chan struct{})

	// Start agent in a goroutine
	go func() {
		log.Println("🖥️  Remote Admin Agent Starting...")
		log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

		s.agent = NewAgent()

		// Main connection loop - keeps reconnecting forever
		for {
			select {
			case <-stopChan:
				return
			default:
			}

			// Connect to central server with retry
			s.agent.ConnectWithRetry()

			// Run agent (will return if connection is lost)
			s.agent.Run()

			// Close old connection before reconnecting
			if s.agent.conn != nil {
				s.agent.conn.Close()
			}

			log.Println("🔄 Reconnecting to server...")
			time.Sleep(2 * time.Second)
		}
	}()

	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}

	// Wait for service stop/shutdown request
	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Interrogate:
				changes <- c.CurrentStatus
			case svc.Stop, svc.Shutdown:
				changes <- svc.Status{State: svc.StopPending}
				close(stopChan)
				if s.agent != nil && s.agent.conn != nil {
					s.agent.conn.Close()
				}
				return false, 0
			}
		}
	}
}

func runService() error {
	return svc.Run("RemoteAdminAgent", &agentService{})
}

// runMain contains the Windows-specific entry point logic
func runMain() {
	// Check if running as Windows service
	isService, err := svc.IsWindowsService()
	if err != nil {
		log.Fatalf("Failed to determine if running as service: %v", err)
	}

	if isService {
		// Running as Windows service - no console output visible
		// Setup log file
		logDir := filepath.Join(os.Getenv("ProgramData"), "Remote Admin Agent")
		os.MkdirAll(logDir, 0755)
		logFile, err := os.OpenFile(filepath.Join(logDir, "agent.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err == nil {
			log.SetOutput(logFile)
			defer logFile.Close()
		}

		err = runService()
		if err != nil {
			log.Fatalf("Service failed: %v", err)
		}
	} else {
		// Running as console application
		// In production mode, disable all logging (silent background mode)
		if PRODUCTION == "true" {
			log.SetOutput(io.Discard)
		} else {
			log.Println("🖥️  Remote Admin Agent Starting...")
			log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		}

		agent := NewAgent()

		// Main connection loop - keeps reconnecting forever
		for {
			// Connect to central server with retry
			agent.ConnectWithRetry()

			// Run agent (will return if connection is lost)
			agent.Run()

			// Close old connection before reconnecting
			if agent.conn != nil {
				agent.conn.Close()
			}

			if PRODUCTION != "true" {
				log.Println("🔄 Reconnecting to server...")
			}
			time.Sleep(2 * time.Second)
		}
	}
}
