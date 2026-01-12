"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Monitor, Maximize2, RefreshCw, MousePointer, Minimize2, Maximize, X, Expand, Shrink, Settings, Zap, Wifi, WifiOff, Mic, MicOff, AlertTriangle, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { API_ENDPOINTS } from "@/lib/api-config"

interface ScreenViewerProps {
  deviceId: string
  deviceName: string
}

export function ScreenViewer({ deviceId, deviceName }: ScreenViewerProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [controlEnabled, setControlEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  
  // WebRTC State
  const [useWebRTC, setUseWebRTC] = useState(true) // Try WebRTC first
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null)
  const [webrtcConnected, setWebrtcConnected] = useState(false)
  
  // Fallback JPEG State
  const [screenImage, setScreenImage] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [screenDimensions, setScreenDimensions] = useState<{ width: number; height: number } | null>(null)
  
  // Settings
  const [quality, setQuality] = useState<number>(60)
  const [fps, setFps] = useState<number>(30)
  const [showCursor, setShowCursor] = useState<boolean>(true)
  const [networkStatus, setNetworkStatus] = useState<'good' | 'medium' | 'slow'>('good')
  const [showSlowNetworkBanner, setShowSlowNetworkBanner] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [adaptiveMode, setAdaptiveMode] = useState(true)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const controlChannelRef = useRef<RTCDataChannel | null>(null)

  // Send control command via data channel
  const sendControl = (command: any) => {
    const channel = controlChannelRef.current
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(command))
    }
  }

  // Calculate scaled coordinates
  const getScaledCoords = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const rect = img.getBoundingClientRect()
    const scaleX = (screenDimensions?.width || rect.width) / rect.width
    const scaleY = (screenDimensions?.height || rect.height) / rect.height
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
      screenWidth: screenDimensions?.width || rect.width,
      screenHeight: screenDimensions?.height || rect.height
    }
  }

  // Mouse handlers
  const handleMouseClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const coords = getScaledCoords(e)
    sendControl({ type: 'mouse', action: 'leftclick', ...coords })
  }

  const handleMouseDoubleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault()
    const coords = getScaledCoords(e)
    sendControl({ type: 'mouse', action: 'doubleclick', ...coords })
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault()
    const coords = getScaledCoords(e)
    sendControl({ type: 'mouse', action: 'rightclick', ...coords })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    // Only send move on button press (drag)
    if (e.buttons > 0) {
      const coords = getScaledCoords(e)
      sendControl({ type: 'mouse', action: 'move', ...coords })
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLImageElement>) => {
    e.preventDefault()
    const coords = getScaledCoords(e as any)
    sendControl({ 
      type: 'mouse', 
      action: 'scroll', 
      deltaY: e.deltaY > 0 ? -1 : 1, // Invert for natural scroll
      ...coords 
    })
  }

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault()
    sendControl({
      type: 'keyboard',
      action: 'keypress',
      keyCode: e.code,
      key: e.keyCode,
      modifiers: [
        e.ctrlKey && 'ctrl',
        e.altKey && 'alt',
        e.shiftKey && 'shift',
        e.metaKey && 'meta'
      ].filter(Boolean)
    })
  }

  // Initialize WebRTC Peer Connection - accepts websocket directly to avoid React closure issues
  const initWebRTC = async (websocket: WebSocket, retryCount = 0) => {
    // Check if WebSocket is ready AND open
    if (!websocket) {
      console.error("WebSocket not provided to initWebRTC")
      return
    }
    
    // Stop if WebSocket is CLOSED (readyState 3) or CLOSING (readyState 2)
    if (websocket.readyState === WebSocket.CLOSED || websocket.readyState === WebSocket.CLOSING) {
      console.error("WebSocket is closed/closing, cannot initialize WebRTC")
      return
    }
    
    if (websocket.readyState !== WebSocket.OPEN) {
      // Max 10 retries
      if (retryCount >= 10) {
        console.error("WebSocket connection timeout after 10 retries")
        return
      }
      console.log("WebSocket not ready yet, waiting... (attempt", retryCount + 1, ")")
      setTimeout(() => initWebRTC(websocket, retryCount + 1), 500)
      return
    }

    console.log("🎥 Initializing WebRTC with ready WebSocket...")
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      // Create a data channel from client side - this triggers proper SDP negotiation
      // We create 'control' channel for sending mouse/keyboard input
      const controlChannel = pc.createDataChannel('control', { ordered: true })
      controlChannel.onopen = () => {
        console.log("🎮 Control channel opened")
        controlChannelRef.current = controlChannel
      }
      
      // We'll also receive 'screen' data channel from agent
      console.log("📺 Created control channel, waiting for screen channel from agent...")

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && websocket.readyState === WebSocket.OPEN) {
          console.log("📡 Sending ICE candidate")
          websocket.send(JSON.stringify({
            type: 'webrtc_signal',
            device_id: deviceId,
            data: {
              type: 'ice_candidate',
              candidate: event.candidate
            }
          }))
        }
      }

      // Handle incoming data channel from agent
      pc.ondatachannel = (event) => {
        console.log("🎬 Received data channel:", event.channel.label)
        const channel = event.channel
        
        channel.onopen = () => {
          console.log("📺 Data channel opened!")
          setWebrtcConnected(true)
        }
        
        channel.onclose = () => {
          console.log("📺 Data channel closed")
          setWebrtcConnected(false)
        }
        
        // Set binary type to arraybuffer for better performance
        channel.binaryType = 'arraybuffer'
        
        channel.onmessage = (msgEvent) => {
          try {
            // Data comes as ArrayBuffer - decode to string
            let data: string
            if (msgEvent.data instanceof ArrayBuffer) {
              data = new TextDecoder().decode(msgEvent.data)
            } else if (typeof msgEvent.data === 'string') {
              data = msgEvent.data
            } else {
              console.warn("Unknown data type:", typeof msgEvent.data)
              return
            }
            
            const frame = JSON.parse(data)
            if (frame.type === 'frame' && frame.image) {
              // Display the JPEG frame
              setScreenImage(`data:image/jpeg;base64,${frame.image}`)
              if (frame.width && frame.height) {
                setScreenDimensions({ width: frame.width, height: frame.height })
              }
            }
          } catch (e) {
            // Silently ignore parse errors (can happen during connection)
          }
        }
      }

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log("WebRTC Connection state:", pc.connectionState)
        if (pc.connectionState === 'connected') {
          setWebrtcConnected(true)
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setWebrtcConnected(false)
          console.warn("WebRTC connection failed/disconnected")
          // Don't auto-switch to JPEG - let user manually switch if needed
        }
      }

      // No automatic timeout fallback - let WebRTC connect or fail cleanly

      // Create offer and wait for ICE gathering to complete
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering to complete (or timeout after 3 seconds)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve()
          return
        }
        
        const timeout = setTimeout(() => {
          console.log("ICE gathering timeout, sending offer anyway")
          resolve()
        }, 3000)
        
        pc.onicegatheringstatechange = () => {
          console.log("ICE gathering state:", pc.iceGatheringState)
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout)
            resolve()
          }
        }
      })

      // Get the final SDP with ICE candidates
      const finalSDP = pc.localDescription?.sdp
      
      if (!finalSDP) {
        console.error("No SDP available after ICE gathering")
        return
      }

      console.log("📤 Sending WebRTC offer to device:", deviceId, "SDP length:", finalSDP.length)
      websocket.send(JSON.stringify({
        type: 'webrtc_signal',
        device_id: deviceId,
        data: {
          type: 'offer',
          sdp: finalSDP
        }
      }))

      setPeerConnection(pc)
      peerConnectionRef.current = pc // Store in ref for callbacks
    } catch (error) {
      console.error("WebRTC initialization failed:", error)
      // Don't auto-switch - just log the error
    }
  }

  // Helper function to start JPEG streaming
  const startJpegStreaming = (websocket: WebSocket) => {
    if (websocket.readyState === WebSocket.OPEN) {
      console.log("📷 Starting JPEG streaming fallback...")
      websocket.send(JSON.stringify({
        type: "screen_capture",
        device_id: deviceId,
        data: {
          action: "start",
          quality: quality,
          show_cursor: showCursor
        }
      }))
    }
  }

  // WebSocket connection
  useEffect(() => {
    if (!isStreaming) return

    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      console.log("🖥️ Screen viewer WebSocket connected")
      setWs(websocket)
      
      // Wait a bit for WebSocket to be fully ready, then try WebRTC
      if (useWebRTC) {
        setTimeout(() => {
          console.log("🎥 Starting WebRTC initialization...")
          initWebRTC(websocket) // Pass websocket directly!
        }, 500)
      } else {
        // Use JPEG fallback
        websocket.send(JSON.stringify({
          type: "screen_capture",
          device_id: deviceId,
          data: {
            action: "start",
            quality: quality,
            show_cursor: showCursor
          }
        }))
      }
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      // Debug: Log all WebRTC related messages
      if (message.type?.includes('webrtc') || message.type?.includes('ice')) {
        console.log("🔍 WebRTC message received:", message.type, "device:", message.device_id)
      }
      
      // Handle WebRTC signaling
      if ((message.type === "webrtc_answer" || message.type === "webrtc_offer_response") && message.device_id === deviceId) {
        console.log("📥 Received WebRTC answer:", message.type, "has data:", !!message.data, "has sdp:", !!message.data?.sdp)
        const pc = peerConnectionRef.current
        console.log("📥 PeerConnection state:", pc?.signalingState)
        if (pc && message.data && message.data.sdp) {
          console.log("📥 Setting remote description with SDP length:", message.data.sdp.length)
          pc.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: message.data.sdp
          })).then(() => {
            console.log("✅ Remote description set successfully!")
          }).catch((err: any) => {
            console.error("❌ Failed to set remote description:", err)
          })
        } else {
          console.warn("⚠️ Cannot set remote description - peerConnection:", !!pc, "data:", !!message.data, "sdp:", !!message.data?.sdp)
        }
      }
      
      if (message.type === "webrtc_ice" && message.device_id === deviceId) {
        console.log("📡 Received ICE candidate")
        if (peerConnection && message.data && message.data.candidate) {
          peerConnection.addIceCandidate(new RTCIceCandidate(message.data.candidate))
        }
      }
      
      // Handle JPEG fallback - accept images when WebRTC is not connected
      if ((message.type === "screen_capture" || message.type === "screen_frame") && message.device_id === deviceId) {
        if (message.data && message.data.image && !webrtcConnected) {
          setScreenImage(`data:image/jpeg;base64,${message.data.image}`)
          if (message.data.width && message.data.height) {
            setScreenDimensions({ width: message.data.width, height: message.data.height })
          }
          if (message.data.cursor_x !== undefined && message.data.cursor_y !== undefined) {
            setCursorPos({ x: message.data.cursor_x, y: message.data.cursor_y })
          }
          if (message.data.network_status) {
            setNetworkStatus(message.data.network_status)
          }
        }
      }
      
      // Network status updates
      if (message.type === "network_status" && message.device_id === deviceId) {
        const qual = message.data?.quality || 'good'
        setNetworkStatus(qual)
        if (qual === 'slow') {
          setShowSlowNetworkBanner(true)
        }
      }
    }

    websocket.onerror = (error) => {
      console.error("Screen WebSocket error:", error)
      setIsStreaming(false)
    }

    // JPEG streaming interval (only if not using WebRTC)
    let streamInterval: NodeJS.Timeout | null = null
    if (!useWebRTC) {
      const interval = Math.round(1000 / fps)
      streamInterval = setInterval(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: "screen_capture",
            device_id: deviceId,
            data: {
              action: "capture",
              quality: quality,
              show_cursor: showCursor
            }
          }))
        }
      }, interval)
    }

    return () => {
      if (streamInterval) clearInterval(streamInterval)
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: "screen_capture",
          device_id: deviceId,
          data: { action: "stop" }
        }))
      }
      websocket.close()
      if (peerConnection) {
        peerConnection.close()
      }
    }
  }, [isStreaming, useWebRTC, fps, quality, showCursor])

  const handleStartStream = () => {
    setIsStreaming(true)
  }

  const handleStopStream = () => {
    setIsStreaming(false)
    setScreenImage(null)
    setCursorPos(null)
    setScreenDimensions(null)
    setNetworkStatus('good')
    setShowSlowNetworkBanner(false)
    setVoiceEnabled(false)
    setWebrtcConnected(false)
    if (peerConnection) {
      peerConnection.close()
      setPeerConnection(null)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const qualityPresets = [
    { label: "Low (Fast)", value: 30, description: "30% quality" },
    { label: "Medium", value: 50, description: "50% quality" },
    { label: "High", value: 70, description: "70% quality" },
    { label: "Ultra", value: 90, description: "90% quality" },
  ]

  const fpsPresets = [
    { label: "10 FPS", value: 10, description: "Low bandwidth" },
    { label: "15 FPS", value: 15, description: "Balanced" },
    { label: "20 FPS", value: 20, description: "Smooth" },
    { label: "30 FPS", value: 30, description: "Maximum" },
  ]

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Remote Screen {useWebRTC && webrtcConnected && <Badge variant="outline" className="ml-2 border-green-500 bg-green-500/10 text-green-400"><Video className="h-3 w-3 mr-1" />WebRTC</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400">
                <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live ({fps} FPS)
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border-slate-700 bg-slate-800">
                <DropdownMenuLabel className="text-slate-300">Stream Mode</DropdownMenuLabel>
                <DropdownMenuItem
                  className={`text-slate-200 hover:bg-slate-700 ${useWebRTC ? 'bg-slate-700' : ''}`}
                  onClick={() => setUseWebRTC(true)}
                >
                  <div className="flex justify-between w-full">
                    <span>WebRTC (Recommended)</span>
                    <span className="text-slate-400 text-xs">Low latency</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`text-slate-200 hover:bg-slate-700 ${!useWebRTC ? 'bg-slate-700' : ''}`}
                  onClick={() => setUseWebRTC(false)}
                >
                  <div className="flex justify-between w-full">
                    <span>JPEG Fallback</span>
                    <span className="text-slate-400 text-xs">Compatible</span>
                  </div>
                </DropdownMenuItem>
                {!useWebRTC && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuLabel className="text-slate-300">Quality</DropdownMenuLabel>
                    {qualityPresets.map((preset) => (
                      <DropdownMenuItem
                        key={preset.value}
                        className={`text-slate-200 hover:bg-slate-700 ${quality === preset.value ? 'bg-slate-700' : ''}`}
                        onClick={() => setQuality(preset.value)}
                      >
                        <div className="flex justify-between w-full">
                          <span>{preset.label}</span>
                          <span className="text-slate-400 text-xs">{preset.description}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuLabel className="text-slate-300">Frame Rate</DropdownMenuLabel>
                    {fpsPresets.map((preset) => (
                      <DropdownMenuItem
                        key={preset.value}
                        className={`text-slate-200 hover:bg-slate-700 ${fps === preset.value ? 'bg-slate-700' : ''}`}
                        onClick={() => setFps(preset.value)}
                      >
                        <div className="flex justify-between w-full">
                          <span>{preset.label}</span>
                          <span className="text-slate-400 text-xs">{preset.description}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Badge
              variant="outline"
              className={`${networkStatus === 'good'
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : networkStatus === 'medium'
                  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
                }`}
            >
              {networkStatus === 'good' ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
              {networkStatus === 'good' ? 'Good' : networkStatus === 'medium' ? 'Medium' : 'Slow'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              onClick={() => setControlEnabled(!controlEnabled)}
            >
              <MousePointer className="mr-2 h-4 w-4" />
              {controlEnabled ? "Disable" : "Enable"} Control
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className={`w-full overflow-hidden rounded-lg bg-slate-950 border border-slate-800 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'aspect-video'}`}
        >
          {!isStreaming ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Monitor className="h-16 w-16 text-slate-600" />
              <div className="text-center">
                <h3 className="mb-2 text-lg font-semibold text-slate-300">Screen View</h3>
                <p className="mb-4 text-sm text-slate-500">
                  {useWebRTC ? 'Start streaming with WebRTC for best quality' : 'Start streaming with JPEG fallback'}
                </p>
                <Button onClick={handleStartStream} className="bg-blue-600 hover:bg-blue-700">
                  <Monitor className="mr-2 h-4 w-4" />
                  Start Screen Stream
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full bg-slate-950">
              {showSlowNetworkBanner && !useWebRTC && (
                <div className="absolute top-0 left-0 right-0 z-20 bg-amber-500/95 text-white px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Slow network detected</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-amber-600"
                    onClick={() => setShowSlowNetworkBanner(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Screen Image - works for both WebRTC data channel and JPEG fallback */}
              {screenImage && (
                <img
                  ref={canvasRef}
                  src={screenImage}
                  alt="Screen capture"
                  className="w-full h-full object-contain cursor-crosshair select-none outline-none"
                  draggable={false}
                  tabIndex={0}
                  onClick={handleMouseClick}
                  onDoubleClick={handleMouseDoubleClick}
                  onContextMenu={handleContextMenu}
                  onMouseMove={handleMouseMove}
                  onWheel={handleWheel}
                  onKeyDown={handleKeyDown}
                  onDragStart={(e) => e.preventDefault()}
                />
              )}
              
              {/* Loading state - show when no screen image yet */}
              {!screenImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4 h-24 w-24 mx-auto rounded-full bg-blue-600/10 flex items-center justify-center">
                      <Monitor className="h-12 w-12 text-blue-500 animate-pulse" />
                    </div>
                    <p className="text-slate-400 mb-4">
                      {useWebRTC ? 'Establishing WebRTC connection...' : 'Connecting to screen stream...'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Controls overlay */}
              {(webrtcConnected || screenImage) && (
                <>
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-slate-900/90 text-white hover:bg-slate-800"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                      {isFullscreen ? <Shrink className="mr-1 h-4 w-4" /> : <Expand className="mr-1 h-4 w-4" />}
                      {isFullscreen ? "Exit" : "Fullscreen"}
                    </Button>
                  </div>
                  
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-700 bg-red-950/20 text-red-400 hover:bg-red-950/40"
                      onClick={handleStopStream}
                    >
                      Stop Stream
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
