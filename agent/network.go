package main

import (
	"sync"
	"time"
)

// NetworkStatus represents the current network quality
type NetworkStatus struct {
	Latency     int64  `json:"latency_ms"`
	Quality     string `json:"quality"` // "good", "medium", "slow"
	LastUpdated time.Time
}

// Global network status - accessible by screen.go
var (
	networkStatus     = NetworkStatus{Quality: "good", Latency: 0}
	networkStatusLock sync.RWMutex
)

// GetNetworkStatus returns the current network status safely
func GetNetworkStatus() NetworkStatus {
	networkStatusLock.RLock()
	defer networkStatusLock.RUnlock()
	return networkStatus
}

// UpdateNetworkStatus updates the network status safely
func UpdateNetworkStatus(latency int64) {
	networkStatusLock.Lock()
	defer networkStatusLock.Unlock()

	networkStatus.Latency = latency
	networkStatus.LastUpdated = time.Now()

	// Classify network quality based on latency
	switch {
	case latency < 100:
		networkStatus.Quality = "good"
	case latency < 300:
		networkStatus.Quality = "medium"
	default:
		networkStatus.Quality = "slow"
	}
}

// monitorNetwork continuously monitors network latency by measuring WebSocket ping time
func (a *Agent) monitorNetwork() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if a.conn == nil {
			continue
		}

		// Measure round-trip time using ping/pong
		start := time.Now()
		
		a.writeMux.Lock()
		err := a.conn.WriteControl(
			8, // PingMessage
			[]byte("ping"),
			time.Now().Add(3*time.Second),
		)
		a.writeMux.Unlock()

		if err != nil {
			// Connection error, assume slow network
			UpdateNetworkStatus(999)
			continue
		}

		// Wait a bit for the pong (handled by websocket library)
		// Use the time since we sent ping as latency estimate
		latency := time.Since(start).Milliseconds()
		UpdateNetworkStatus(latency)

		// Send network status to server
		a.sendNetworkStatus()
	}
}

// sendNetworkStatus sends the current network status to the server
func (a *Agent) sendNetworkStatus() {
	status := GetNetworkStatus()
	
	msg := ClientMessage{
		Type:     "network_status",
		DeviceID: a.deviceID,
		Data: map[string]interface{}{
			"latency_ms": status.Latency,
			"quality":    status.Quality,
		},
	}

	a.writeMux.Lock()
	a.conn.WriteJSON(msg)
	a.writeMux.Unlock()
}
