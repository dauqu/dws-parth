"use client"

import { API_ENDPOINTS } from './api-config'

type MessageHandler = (message: any) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isConnecting = false

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('WebSocket already connected or connecting')
      return
    }

    this.isConnecting = true
    console.log('🔌 Connecting to WebSocket:', API_ENDPOINTS.ws)

    try {
      this.ws = new WebSocket(API_ENDPOINTS.ws)

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully')
        this.isConnecting = false
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('📨 WebSocket message:', message.type, 'device:', message.device_id)
          
          // Notify all handlers
          this.handlers.forEach(handler => {
            try {
              handler(message)
            } catch (error) {
              console.error('Error in message handler:', error)
            }
          })
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        this.isConnecting = false
      }

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected, reconnecting in 3s...')
        this.isConnecting = false
        this.ws = null
        
        // Auto-reconnect
        this.reconnectTimeout = setTimeout(() => {
          this.connect()
        }, 3000)
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      this.isConnecting = false
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.handlers.clear()
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      console.log('📤 Sent message:', message.type, 'device:', message.device_id)
      return true
    } else {
      console.warn('WebSocket not connected, cannot send message')
      return false
    }
  }

  addMessageHandler(handler: MessageHandler) {
    this.handlers.add(handler)
    
    // Connect if not already connected
    if (!this.ws) {
      this.connect()
    }
    
    // Return cleanup function
    return () => {
      this.handlers.delete(handler)
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Create singleton instance
export const wsService = new WebSocketService()

// Auto-connect on module load (in browser)
if (typeof window !== 'undefined') {
  wsService.connect()
}
