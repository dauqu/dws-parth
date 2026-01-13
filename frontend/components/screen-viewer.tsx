"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Monitor, MousePointer, Expand, Shrink, Settings, Wifi, WifiOff, X, Play, Square, MoreVertical, Maximize2 } from "lucide-react"
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
  const [useWebRTC, setUseWebRTC] = useState(true)
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null)
  const [webrtcConnected, setWebrtcConnected] = useState(false)
  
  // Screen State
  const [screenImage, setScreenImage] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [screenDimensions, setScreenDimensions] = useState<{ width: number; height: number } | null>(null)
  
  // Settings
  const [quality, setQuality] = useState<number>(60)
  const [fps, setFps] = useState<number>(30)
  const [showCursor, setShowCursor] = useState<boolean>(true)
  const [networkStatus, setNetworkStatus] = useState<'good' | 'medium' | 'slow'>('good')
  
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
    if (!controlEnabled) return
    const coords = getScaledCoords(e)
    sendControl({ type: 'mouse', action: 'leftclick', ...coords })
  }

  const handleMouseDoubleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!controlEnabled) return
    e.preventDefault()
    const coords = getScaledCoords(e)
    sendControl({ type: 'mouse', action: 'doubleclick', ...coords })
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!controlEnabled) return
    e.preventDefault()
    const coords = getScaledCoords(e)
    sendControl({ type: 'mouse', action: 'rightclick', ...coords })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!controlEnabled || e.buttons === 0) return
    const coords = getScaledCoords(e)
    sendControl({ type: 'mouse', action: 'move', ...coords })
  }

  const handleWheel = (e: React.WheelEvent<HTMLImageElement>) => {
    if (!controlEnabled) return
    e.preventDefault()
    const coords = getScaledCoords(e as any)
    sendControl({ type: 'mouse', action: 'scroll', deltaY: e.deltaY > 0 ? -1 : 1, ...coords })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!controlEnabled) return
    e.preventDefault()
    sendControl({
      type: 'keyboard',
      action: 'keypress',
      keyCode: e.code,
      key: e.keyCode,
      modifiers: [e.ctrlKey && 'ctrl', e.altKey && 'alt', e.shiftKey && 'shift', e.metaKey && 'meta'].filter(Boolean)
    })
  }

  // Initialize WebRTC
  const initWebRTC = async (websocket: WebSocket, retryCount = 0) => {
    console.log('🔵 InitWebRTC called, retry:', retryCount)
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.log('⚠️ WebSocket not ready, state:', websocket?.readyState)
      if (retryCount < 10) {
        setTimeout(() => initWebRTC(websocket, retryCount + 1), 500)
      }
      return
    }

    try {
      console.log('🔧 Creating RTCPeerConnection...')
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10
      })
      console.log('✅ RTCPeerConnection created with multiple STUN servers')

      const controlChannel = pc.createDataChannel('control', { ordered: true })
      controlChannel.onopen = () => { controlChannelRef.current = controlChannel }

      pc.onicecandidate = (event) => {
        if (event.candidate && websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: 'webrtc_signal', device_id: deviceId,
            data: { type: 'ice_candidate', candidate: event.candidate }
          }))
        }
      }

      pc.ondatachannel = (event) => {
        const channel = event.channel
        channel.onopen = () => setWebrtcConnected(true)
        channel.onclose = () => setWebrtcConnected(false)
        channel.binaryType = 'arraybuffer'
        channel.onmessage = (msgEvent) => {
          try {
            let data = msgEvent.data instanceof ArrayBuffer 
              ? new TextDecoder().decode(msgEvent.data) 
              : msgEvent.data
            const frame = JSON.parse(data)
            if (frame.type === 'frame' && frame.image) {
              setScreenImage(`data:image/jpeg;base64,${frame.image}`)
              if (frame.width && frame.height) {
                setScreenDimensions({ width: frame.width, height: frame.height })
              }
            }
          } catch (e) {}
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setWebrtcConnected(true)
        else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') setWebrtcConnected(false)
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return }
        const timeout = setTimeout(resolve, 3000)
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') { clearTimeout(timeout); resolve() }
        }
      })

      const offerMessage = {
        type: 'webrtc_signal', device_id: deviceId,
        data: { type: 'offer', sdp: pc.localDescription?.sdp }
      }
      console.log('📤 Sending WebRTC offer to device:', deviceId)
      console.log('📤 Offer SDP length:', pc.localDescription?.sdp?.length)
      websocket.send(JSON.stringify(offerMessage))

      setPeerConnection(pc)
      peerConnectionRef.current = pc
    } catch (error) {
      console.error("❌ WebRTC initialization failed:", error)
    }
  }

  // WebSocket connection
  useEffect(() => {
    if (!isStreaming) return

    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      setWs(websocket)
      if (useWebRTC) {
        setTimeout(() => initWebRTC(websocket), 500)
      } else {
        websocket.send(JSON.stringify({
          type: "screen_capture", device_id: deviceId,
          data: { action: "start", quality, show_cursor: showCursor }
        }))
      }
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if ((message.type === "webrtc_answer" || message.type === "webrtc_offer_response") && message.device_id === deviceId) {
        console.log('📥 Received WebRTC answer from agent:', deviceId)
        console.log('📥 Answer SDP length:', message.data?.sdp?.length)
        const pc = peerConnectionRef.current
        if (pc && message.data?.sdp) {
          console.log('✅ Setting remote description...')
          pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: message.data.sdp }))
            .then(() => console.log('✅ Remote description set successfully'))
            .catch(err => console.error('❌ Failed to set remote description:', err))
        } else {
          console.error('❌ No peer connection or SDP in answer')
        }
      }
      
      if (message.type === "webrtc_ice" && message.device_id === deviceId) {
        if (peerConnection && message.data?.candidate) {
          peerConnection.addIceCandidate(new RTCIceCandidate(message.data.candidate))
        }
      }
      
      if ((message.type === "screen_capture" || message.type === "screen_frame") && message.device_id === deviceId) {
        if (message.data?.image && !webrtcConnected) {
          setScreenImage(`data:image/jpeg;base64,${message.data.image}`)
          if (message.data.width && message.data.height) {
            setScreenDimensions({ width: message.data.width, height: message.data.height })
          }
          if (message.data.network_status) setNetworkStatus(message.data.network_status)
        }
      }
    }

    websocket.onerror = () => setIsStreaming(false)

    let streamInterval: NodeJS.Timeout | null = null
    if (!useWebRTC) {
      streamInterval = setInterval(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: "screen_capture", device_id: deviceId,
            data: { action: "capture", quality, show_cursor: showCursor }
          }))
        }
      }, Math.round(1000 / fps))
    }

    return () => {
      if (streamInterval) clearInterval(streamInterval)
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: "screen_capture", device_id: deviceId, data: { action: "stop" } }))
      }
      websocket.close()
      peerConnection?.close()
    }
  }, [isStreaming, useWebRTC, fps, quality, showCursor])

  const handleStartStream = () => setIsStreaming(true)
  const handleStopStream = () => {
    setIsStreaming(false)
    setScreenImage(null)
    setScreenDimensions(null)
    setNetworkStatus('good')
    setWebrtcConnected(false)
    peerConnection?.close()
    setPeerConnection(null)
  }

  // Use browser fullscreen API
  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${isFullscreen ? 'bg-black' : ''}`}>
      {/* Compact Toolbar */}
      <div className={`flex items-center justify-between h-10 px-3 shrink-0 ${isFullscreen ? 'bg-black/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10' : 'bg-[#111111] border-b border-slate-800'} rounded-t-lg`}>
        {/* Left - Status */}
        <div className="flex items-center gap-2">
          {isStreaming && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 font-medium">Live</span>
              {webrtcConnected && <span className="text-slate-500">• WebRTC</span>}
            </div>
          )}
          {!isStreaming && (
            <span className="text-xs text-slate-500">Screen Viewer</span>
          )}
        </div>

        {/* Center - Nothing */}
        <div className="flex-1" />

        {/* Right - Controls */}
        <div className="flex items-center gap-1">
          {isStreaming ? (
            <>
              {/* Control Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-xs ${controlEnabled ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setControlEnabled(!controlEnabled)}
                title={controlEnabled ? "Disable remote control" : "Enable remote control"}
              >
                <MousePointer className="h-3 w-3 mr-1" />
                Control
              </Button>

              {/* Network Status */}
              <div className={`flex items-center gap-1 px-2 h-7 rounded text-xs ${
                networkStatus === 'good' ? 'text-green-400' : networkStatus === 'medium' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {networkStatus === 'good' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              </div>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              </Button>

              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 border-slate-700 bg-slate-800">
                  <DropdownMenuItem
                    className={`text-xs ${useWebRTC ? 'text-blue-400' : 'text-slate-300'}`}
                    onClick={() => setUseWebRTC(true)}
                  >
                    WebRTC Mode
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={`text-xs ${!useWebRTC ? 'text-blue-400' : 'text-slate-300'}`}
                    onClick={() => setUseWebRTC(false)}
                  >
                    JPEG Mode
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Stop Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={handleStopStream}
              >
                <Square className="h-3 w-3 mr-1 fill-current" />
                Stop
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700"
              onClick={handleStartStream}
            >
              <Play className="h-3 w-3 mr-1 fill-current" />
              Start Stream
            </Button>
          )}
        </div>
      </div>

      {/* Screen Container - fills available space */}
      <div className={`flex-1 bg-[#0a0a0a] ${isFullscreen ? '' : 'rounded-b-lg'} overflow-hidden flex items-center justify-center`}>
        {!isStreaming ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-20 w-20 rounded-2xl bg-slate-800/50 flex items-center justify-center">
              <Monitor className="h-10 w-10 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Remote Screen</p>
              <p className="text-xs text-slate-600">Click Start to begin streaming</p>
            </div>
          </div>
        ) : screenImage ? (
          <img
            ref={canvasRef}
            src={screenImage}
            alt="Remote screen"
            className="w-full h-full object-contain select-none outline-none"
            style={{ cursor: controlEnabled ? 'crosshair' : 'default' }}
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
        ) : (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Monitor className="h-8 w-8 text-blue-400 animate-pulse" />
            </div>
            <p className="text-sm text-slate-400">
              {useWebRTC ? 'Connecting via WebRTC...' : 'Connecting...'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
