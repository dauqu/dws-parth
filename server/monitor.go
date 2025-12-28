package main

import (
	"encoding/json"
	"os"
	"runtime"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

type SystemInfo struct {
	CPUUsage    float64   `json:"cpu_usage"`
	CPUCores    int       `json:"cpu_cores"`
	RAMTotal    uint64    `json:"ram_total"`
	RAMUsed     uint64    `json:"ram_used"`
	RAMPercent  float64   `json:"ram_percent"`
	DiskTotal   uint64    `json:"disk_total"`
	DiskUsed    uint64    `json:"disk_used"`
	DiskPercent float64   `json:"disk_percent"`
	OS          string    `json:"os"`
	Platform    string    `json:"platform"`
	Hostname    string    `json:"hostname"`
	Username    string    `json:"username"`
	IPAddress   string    `json:"ip_address"`
	Uptime      uint64    `json:"uptime"`
	Timestamp   time.Time `json:"timestamp"`
}

func GetSystemInfo() (*SystemInfo, error) {
	info := &SystemInfo{
		Timestamp: time.Now(),
		OS:        runtime.GOOS,
		CPUCores:  runtime.NumCPU(),
	}

	// CPU Usage
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuPercent) > 0 {
		info.CPUUsage = cpuPercent[0]
	}

	// RAM Info
	vmem, err := mem.VirtualMemory()
	if err == nil {
		info.RAMTotal = vmem.Total
		info.RAMUsed = vmem.Used
		info.RAMPercent = vmem.UsedPercent
	}

	// Disk Info
	diskStat, err := disk.Usage("/")
	if err == nil {
		info.DiskTotal = diskStat.Total
		info.DiskUsed = diskStat.Used
		info.DiskPercent = diskStat.UsedPercent
	}

	// Host Info
	hostInfo, err := host.Info()
	if err == nil {
		info.Hostname = hostInfo.Hostname
		info.Uptime = hostInfo.Uptime
		info.Platform = hostInfo.Platform + " " + hostInfo.PlatformVersion
		info.OS = hostInfo.OS
	}

	// Get Windows username
	if username := os.Getenv("USERNAME"); username != "" {
		info.Username = username
	} else if username := os.Getenv("USER"); username != "" {
		info.Username = username
	}

	// Get IP address
	info.IPAddress = getLocalIP()

	return info, nil
}

func GetSystemInfoJSON() ([]byte, error) {
	info, err := GetSystemInfo()
	if err != nil {
		return nil, err
	}
	return json.Marshal(info)
}
