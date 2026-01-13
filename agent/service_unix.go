//go:build !windows
// +build !windows

package main

import (
	"io"
	"log"
	"time"
)

// runMain contains the Unix-specific entry point logic
func runMain() {
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
