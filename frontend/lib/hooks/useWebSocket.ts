"use client"

import { useEffect, useState } from 'react'
import { wsService } from '../websocket-service'

export interface SystemInfo {
  cpu_usage: number
  cpu_cores: number
  ram_total: number
  ram_used: number
  ram_percent: number
  disk_total: number
  disk_used: number
  disk_percent: number
  os: string
  platform: string
  hostname: string
  username: string
  ip_address: string
  uptime: number
}

export function useSystemMetrics(deviceId: string) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    console.log('🔧 useSystemMetrics mounted for device:', deviceId)
    setIsConnected(wsService.isConnected())

    const handleMessage = (message: any) => {
      // Only process system_update messages for this specific device
      if (message.type === 'system_update' && message.device_id === deviceId) {
        console.log('📊 System update for', deviceId, ':', message.data)
        setSystemInfo(message.data)
        setIsConnected(true)
      }
    }

    // Subscribe to messages
    const cleanup = wsService.addMessageHandler(handleMessage)

    // Check connection status periodically
    const interval = setInterval(() => {
      setIsConnected(wsService.isConnected())
    }, 1000)

    return () => {
      console.log('🔧 useSystemMetrics unmounted for device:', deviceId)
      cleanup()
      clearInterval(interval)
    }
  }, [deviceId])

  return { systemInfo, isConnected }
}

export function useWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      console.log('✅ WebSocket connected')
      setIsConnected(true)
      setWs(websocket)
    }

    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
      setIsConnected(false)
    }

    websocket.onclose = () => {
      console.log('🔌 WebSocket disconnected')
      setIsConnected(false)
      setWs(null)
    }

    return () => {
      websocket.close()
    }
  }, [])

  const sendMessage = (type: string, data: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }))
    }
  }

  return { ws, isConnected, sendMessage }
}
