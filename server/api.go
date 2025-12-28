package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// REST API Handlers

func HandleAPIGetDevices(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	devices, err := GetAllDevices()
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    devices,
	})
}

func HandleAPIGetDevice(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	deviceID := vars["id"]

	device, err := GetDeviceByID(deviceID)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    device,
	})
}

func HandleAPIRegisterDevice(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Name string `json:"name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		req.Name = "Device-" + primitive.NewObjectID().Hex()[:8]
	}

	device, err := RegisterDevice(req.Name)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Device registered successfully",
		"data":    device,
	})
}

func HandleAPIUpdateDevice(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	deviceID := vars["id"]

	var req struct {
		Status           string `json:"status"`
		ConnectionStatus string `json:"connection_status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	objID, err := primitive.ObjectIDFromHex(deviceID)
	if err != nil {
		http.Error(w, `{"error": "Invalid device ID"}`, http.StatusBadRequest)
		return
	}

	err = UpdateDeviceStatus(objID, req.Status, req.ConnectionStatus)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Device updated successfully",
	})
}

func HandleAPIDeleteDevice(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	deviceID := vars["id"]

	err := DeleteDevice(deviceID)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Device deleted successfully",
	})
}

func HandleAPISystemInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	info, err := GetSystemInfo()
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    info,
	})
}

func HandleAPIFileList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	path := r.URL.Query().Get("path")
	if path == "" {
		path = "C:\\"
	}

	files, err := ListFiles(path)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    files,
	})
}

func HandleAPIServices(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	services, err := ListServices()
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    services,
	})
}

func SetupRESTAPI(router *mux.Router) {
	// Device management endpoints
	router.HandleFunc("/api/devices", HandleAPIGetDevices).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/devices", HandleAPIRegisterDevice).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/devices/{id}", HandleAPIGetDevice).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/devices/{id}", HandleAPIUpdateDevice).Methods("PUT", "OPTIONS")
	router.HandleFunc("/api/devices/{id}", HandleAPIDeleteDevice).Methods("DELETE", "OPTIONS")

	// System operations endpoints
	router.HandleFunc("/api/system", HandleAPISystemInfo).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/files", HandleAPIFileList).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/services", HandleAPIServices).Methods("GET", "OPTIONS")

	log.Println("✅ REST API endpoints configured")
}
