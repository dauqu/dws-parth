"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Monitor, MousePointer, Expand, Shrink, Settings, Wifi, WifiOff, X, Play, Square, MoreVertical, Maximize2, Eye, EyeOff, GripHorizontal, Ban } from "lucide-react"
import { API_ENDPOINTS } from "@/lib/api-config"

interface ScreenViewerProps {
  deviceId: string
  deviceName: string
}

export function ScreenViewer({ deviceId, deviceName }: ScreenViewerProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [controlEnabled, setControlEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false)
  const [controlsHidden, setControlsHidden] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)

  // Combined check for any fullscreen mode
  const isAnyFullscreen = isFullscreen || isNativeFullscreen
  
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
  const [hideCursor, setHideCursor] = useState(false)
  
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

  // Toggle remote cursor visibility
  const toggleRemoteCursor = () => {
    const newShowCursor = !showCursor
    setShowCursor(newShowCursor)
    // Send command to agent to toggle cursor visibility in screen capture
    sendControl({ type: 'settings', action: 'cursor', show_cursor: newShowCursor })
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
    // First move cursor to the clicked location, then click
    sendControl({ type: 'mouse', action: 'move', ...coords })
    setTimeout(() => {
      sendControl({ type: 'mouse', action: 'leftclick', ...coords })
    }, 10)
  }

  const handleMouseDoubleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!controlEnabled) return
    e.preventDefault()
    const coords = getScaledCoords(e)
    // Move cursor first, then double click
    sendControl({ type: 'mouse', action: 'move', ...coords })
    setTimeout(() => {
      sendControl({ type: 'mouse', action: 'doubleclick', ...coords })
    }, 10)
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!controlEnabled) return
    e.preventDefault()
    const coords = getScaledCoords(e)
    // Move cursor first, then right click
    sendControl({ type: 'mouse', action: 'move', ...coords })
    setTimeout(() => {
      sendControl({ type: 'mouse', action: 'rightclick', ...coords })
    }, 10)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!controlEnabled) return
    const coords = getScaledCoords(e)
    // Always send move to show cursor position
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
          // Google STUN servers
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:3478' },
          { urls: 'stun:stun2.l.google.com:19302' },
          // Metered.ca free STUN
          { urls: 'stun:stun.relay.metered.ca:80' },
          // Metered.ca free TURN servers (for NAT traversal in production)
          {
            urls: 'turn:global.relay.metered.ca:80',
            username: 'e8dd65c92f6135cabcf2a979',
            credential: '5V960dP5iaGPLqXK'
          },
          {
            urls: 'turn:global.relay.metered.ca:80?transport=tcp',
            username: 'e8dd65c92f6135cabcf2a979',
            credential: '5V960dP5iaGPLqXK'
          },
          {
            urls: 'turn:global.relay.metered.ca:443',
            username: 'e8dd65c92f6135cabcf2a979',
            credential: '5V960dP5iaGPLqXK'
          },
          {
            urls: 'turns:global.relay.metered.ca:443?transport=tcp',
            username: 'e8dd65c92f6135cabcf2a979',
            credential: '5V960dP5iaGPLqXK'
          }
        ],
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle'
      })
      console.log('✅ RTCPeerConnection created with STUN + TURN servers for production')

      // Create control channel for mouse/keyboard input
      const controlChannel = pc.createDataChannel('control', { ordered: true })
      controlChannel.onopen = () => { 
        console.log('🎮 Control channel opened')
        controlChannelRef.current = controlChannel 
      }

      // Create screen channel for receiving frames from agent
      const screenChannel = pc.createDataChannel('screen', { ordered: true })
      screenChannel.binaryType = 'arraybuffer'
      screenChannel.onopen = () => {
        console.log('📺 Screen channel OPENED')
        setWebrtcConnected(true)
      }
      screenChannel.onclose = () => {
        console.log('📺 Screen channel CLOSED')
        setWebrtcConnected(false)
      }
      screenChannel.onmessage = (msgEvent) => {
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
        } catch (e) {
          console.error('❌ Failed to parse frame:', e)
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: 'webrtc_signal', device_id: deviceId,
            data: { type: 'ice_candidate', candidate: event.candidate }
          }))
        }
      }

      // Also handle any data channels coming from agent (fallback)
      pc.ondatachannel = (event) => {
        const channel = event.channel
        console.log('📺 Data channel received from agent:', channel.label, 'readyState:', channel.readyState)
        if (channel.label === 'screen') {
          channel.binaryType = 'arraybuffer'
          channel.onopen = () => {
            console.log('📺 Agent screen channel OPENED')
            setWebrtcConnected(true)
          }
          channel.onclose = () => {
            console.log('📺 Agent screen channel CLOSED')
            setWebrtcConnected(false)
          }
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
            } catch (e) {
              console.error('❌ Failed to parse frame:', e)
            }
          }
        }
      }

      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state changed:', pc.connectionState)
        if (pc.connectionState === 'connected') {
          console.log('✅ WebRTC peer connection CONNECTED!')
          setWebrtcConnected(true)
        } else if (pc.connectionState === 'failed') {
          console.log('❌ WebRTC connection FAILED - switching to JPEG fallback mode')
          setWebrtcConnected(false)
          // Auto-fallback to JPEG mode
          setUseWebRTC(false)
          pc.close()
        } else if (pc.connectionState === 'disconnected') {
          console.log('⚠️ WebRTC peer connection DISCONNECTED')
          setWebrtcConnected(false)
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState)
      }

      pc.onicegatheringstatechange = () => {
        console.log('🧊 ICE gathering state:', pc.iceGatheringState)
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send offer immediately (trickle ICE pattern)
      // ICE candidates will be sent via onicecandidate handler as they're gathered
      const offerMessage = {
        type: 'webrtc_signal', device_id: deviceId,
        data: { type: 'offer', sdp: offer.sdp }
      }
      console.log('📤 Sending WebRTC offer to device:', deviceId)
      console.log('📤 Offer SDP length:', offer.sdp?.length)
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

    console.log('🚀 Screen viewer starting, WebRTC mode:', useWebRTC)
    console.log('📡 Connecting to:', API_ENDPOINTS.ws)
    console.log('🎯 Device ID:', deviceId)
    
    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      console.log('✅ WebSocket connected!')
      setWs(websocket)
      if (useWebRTC) {
        console.log('🔄 Starting WebRTC initialization in 500ms...')
        setTimeout(() => initWebRTC(websocket), 500)
      } else {
        console.log('📸 Starting legacy screen capture mode')
        websocket.send(JSON.stringify({
          type: "screen_capture", device_id: deviceId,
          data: { action: "start", quality, show_cursor: showCursor }
        }))
      }
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      // Log all messages for this device for debugging
      if (message.device_id === deviceId || !message.device_id) {
        console.log('📩 Screen viewer received message:', message.type, 'for device:', message.device_id)
      }
      
      if ((message.type === "webrtc_answer" || message.type === "webrtc_offer_response") && message.device_id === deviceId) {
        console.log('📥 Received WebRTC answer from agent:', deviceId)
        console.log('📥 Answer SDP length:', message.data?.sdp?.length)
        console.log('📥 Full answer data:', message.data)
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
        console.log('📡 Received ICE candidate from agent')
        const pc = peerConnectionRef.current
        if (pc && message.data?.candidate) {
          pc.addIceCandidate(new RTCIceCandidate(message.data.candidate))
            .then(() => console.log('✅ ICE candidate added'))
            .catch(err => console.error('❌ Failed to add ICE candidate:', err))
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

  // Toggle in-browser fullscreen (fills viewport)
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev)
    if (isFullscreen) {
      setControlsHidden(false)
      setToolbarPosition({ x: 0, y: 0 }) // Reset position when exiting
    }
  }

  // Draggable toolbar handlers
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isFullscreen) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: toolbarPosition.x,
      posY: toolbarPosition.y
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      setToolbarPosition({
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
        setControlsHidden(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isFullscreen])

  // Detect native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement)
      if (!document.fullscreenElement) {
        setControlsHidden(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Handle keyboard shortcut for hiding/showing controls in fullscreen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Press 'H' to toggle controls visibility in fullscreen
      if (isAnyFullscreen && e.key.toLowerCase() === 'h' && !controlEnabled) {
        setControlsHidden(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isAnyFullscreen, controlEnabled])

  // Show controls when mouse moves to top of screen in fullscreen
  useEffect(() => {
    if (!isAnyFullscreen || !controlsHidden) return
    
    const handleMouseMove = (e: MouseEvent) => {
      // Show controls when mouse is within 50px of top edge
      if (e.clientY <= 50) {
        setControlsHidden(false)
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [isAnyFullscreen, controlsHidden])

  const toggleControlsVisibility = () => {
    if (isAnyFullscreen) {
      setControlsHidden(prev => !prev)
    }
  }

  return (
    <div ref={containerRef} className={`flex flex-col ${isAnyFullscreen ? 'fixed inset-0 z-50 bg-black' : 'h-full'}`}>
      {/* Compact Toolbar - draggable and hideable in fullscreen */}
      <div 
        className={`flex items-center justify-between h-10 px-3 shrink-0 ${isAnyFullscreen ? 'bg-black/90 backdrop-blur-sm absolute z-10 rounded-lg border border-slate-700 shadow-lg' : 'bg-[#111111] border-b border-slate-800'} ${controlsHidden && isAnyFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300 ${isAnyFullscreen ? '' : 'rounded-t-lg'}`}
        style={isAnyFullscreen ? { 
          left: `calc(50% + ${toolbarPosition.x}px)`, 
          top: `${16 + toolbarPosition.y}px`,
          transform: 'translateX(-50%)',
          width: 'auto',
          minWidth: '400px'
        } : undefined}
      >
        {/* Drag Handle - in any fullscreen mode, bigger area for dragging */}
        {isAnyFullscreen && (
          <div 
            className="flex items-center px-3 py-2 -ml-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-l-lg transition-colors"
            onMouseDown={handleDragStart}
          >
            <GripHorizontal className="h-5 w-5" />
          </div>
        )}
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
                className={`h-7 ${isAnyFullscreen ? 'w-7 p-0' : 'px-2'} text-xs ${controlEnabled ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setControlEnabled(!controlEnabled)}
                title={controlEnabled ? "Disable remote control" : "Enable remote control"}
              >
                <MousePointer className={`h-3 w-3 ${isAnyFullscreen ? '' : 'mr-1'}`} />
                {!isAnyFullscreen && 'Control'}
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
                title={isAnyFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isAnyFullscreen ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              </Button>

              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-slate-700 bg-slate-800">
                  {isAnyFullscreen && (
                    <DropdownMenuItem
                      className="text-xs text-slate-300 hover:text-white"
                      onClick={toggleControlsVisibility}
                    >
                      <EyeOff className="h-3 w-3 mr-2" />
                      Hide Controls (H)
                    </DropdownMenuItem>
                  )}
                  {isAnyFullscreen && (
                    <DropdownMenuItem
                      className="text-xs text-slate-300 hover:text-white"
                      onClick={() => {
                        if (containerRef.current?.requestFullscreen) {
                          containerRef.current.requestFullscreen()
                        }
                      }}
                    >
                      <Maximize2 className="h-3 w-3 mr-2" />
                      Native Fullscreen
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-xs text-slate-300 hover:text-white"
                    onClick={() => setHideCursor(prev => !prev)}
                  >
                    {hideCursor ? <MousePointer className="h-3 w-3 mr-2" /> : <Ban className="h-3 w-3 mr-2" />}
                    {hideCursor ? 'Show Local Cursor' : 'Hide Local Cursor'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs text-slate-300 hover:text-white"
                    onClick={toggleRemoteCursor}
                  >
                    {showCursor ? <Ban className="h-3 w-3 mr-2" /> : <MousePointer className="h-3 w-3 mr-2" />}
                    {showCursor ? 'Hide Remote Cursor' : 'Show Remote Cursor'}
                  </DropdownMenuItem>
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
      <div className={`flex-1 bg-[#0a0a0a] ${isAnyFullscreen ? '' : 'rounded-b-lg'} overflow-hidden flex items-center justify-center`}>
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
            style={{ cursor: hideCursor ? 'none' : (controlEnabled ? 'pointer' : 'default') }}
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
