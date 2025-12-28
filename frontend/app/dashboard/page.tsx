"use client"

import { useEffect, useState } from "react"
import { DeviceGrid } from "@/components/device-grid"
import { DashboardHeader } from "@/components/dashboard-header"
import { fetchDevices } from "@/lib/api-client"
import type { Device } from "@/lib/types"
import { wsService } from "@/lib/websocket-service"

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDevices()
    
    // Listen for real-time device updates via WebSocket
    const handleMessage = (message: any) => {
      if (message.type === 'device_connected') {
        console.log('📱 Device connected:', message.data)
        // Reload devices to get the new one
        loadDevices()
      } else if (message.type === 'device_disconnected') {
        console.log('📱 Device disconnected:', message.device_id)
        // Update device status to offline
        setDevices(prevDevices => 
          prevDevices.map(device => 
            device.id === message.device_id 
              ? { ...device, status: 'offline', connection_status: 'disconnected' }
              : device
          )
        )
      } else if (message.type === 'device_list') {
        console.log('📋 Device list received:', message.data)
        if (Array.isArray(message.data)) {
          setDevices(message.data)
          setLoading(false)
        }
      }
    }

    const cleanup = wsService.addMessageHandler(handleMessage)
    
    // Also refresh every 30 seconds as backup
    const interval = setInterval(loadDevices, 30000)
    
    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [])

  async function loadDevices() {
    try {
      const data = await fetchDevices()
      setDevices(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices")
      console.error("Failed to load devices:", err)
    } finally {
      setLoading(false)
    }
  }

  const demoUser = {
    id: "user-1",
    email: "demo@devicedashboard.com",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <DashboardHeader user={demoUser} />
      <main className="container mx-auto px-6 py-8 pt-24">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Device Management</h1>
          <p className="text-slate-400">Monitor and control your Windows devices</p>
        </div>
        
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-slate-400">Loading devices...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-red-400">⚠️ {error}</p>
            <p className="mt-2 text-sm text-slate-400">
              Make sure the backend server is running on http://localhost:8080
            </p>
            <button
              onClick={loadDevices}
              className="mt-3 rounded bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && devices.length === 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
            <p className="text-slate-400">No devices registered yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Start the server on a device to register it automatically.
            </p>
          </div>
        )}

        {!loading && !error && devices.length > 0 && (
          <DeviceGrid devices={devices} />
        )}
      </main>
    </div>
  )
}
