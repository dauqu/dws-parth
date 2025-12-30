"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Monitor, Maximize2, RefreshCw, MousePointer, Minimize2, Maximize, X, Expand, Shrink, Settings, Zap } from "lucide-react"
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
  const [screenImage, setScreenImage] = useState<string | null>(null)
  const [quality, setQuality] = useState<number>(60) // JPEG quality 1-100
  const [fps, setFps] = useState<number>(10) // Frames per second
  const [showCursor, setShowCursor] = useState<boolean>(true)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [screenDimensions, setScreenDimensions] = useState<{ width: number; height: number } | null>(null)
  const canvasRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isStreaming) return

    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      console.log("🖥️ Screen viewer WebSocket connected")
      setWs(websocket)
      // Request screen capture with quality and cursor settings
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

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === "screen_capture" || message.type === "screen_frame") {
        // Server returns screen data in message.data
        if (message.data && message.data.image) {
          setScreenImage(`data:image/jpeg;base64,${message.data.image}`)
          // Store screen dimensions for cursor rendering
          if (message.data.width && message.data.height) {
            setScreenDimensions({ width: message.data.width, height: message.data.height })
          }
          // Update cursor position if provided
          if (message.data.cursor_x !== undefined && message.data.cursor_y !== undefined) {
            setCursorPos({ x: message.data.cursor_x, y: message.data.cursor_y })
          }
        }
      }
    }

    websocket.onerror = (error) => {
      console.error("Screen WebSocket error:", error)
      setIsStreaming(false)
    }

    // Continuous refresh for streaming based on FPS setting
    const interval = Math.round(1000 / fps)
    const streamInterval = setInterval(() => {
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

    return () => {
      clearInterval(streamInterval)
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: "screen_capture",
          device_id: deviceId,
          data: { action: "stop" }
        }))
      }
      websocket.close()
    }
  }, [isStreaming, fps, quality, showCursor])

  const handleStartStream = () => {
    setIsStreaming(true)
  }

  const handleStopStream = () => {
    setIsStreaming(false)
    setScreenImage(null)
    setCursorPos(null)
    setScreenDimensions(null)
  }

  const qualityPresets = [
    { label: "Low (Fast)", value: 30, description: "30% quality" },
    { label: "Medium", value: 50, description: "50% quality" },
    { label: "High", value: 70, description: "70% quality" },
    { label: "Ultra", value: 90, description: "90% quality" },
  ]

  const fpsPresets = [
    { label: "5 FPS", value: 5, description: "Low bandwidth" },
    { label: "10 FPS", value: 10, description: "Balanced" },
    { label: "15 FPS", value: 15, description: "Smooth" },
    { label: "20 FPS", value: 20, description: "High refresh" },
    { label: "30 FPS", value: 30, description: "Maximum" },
  ]

  const getCursorStyle = () => {
    if (!cursorPos || !screenDimensions || !canvasRef.current) return {}
    
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = rect.width / screenDimensions.width
    const scaleY = rect.height / screenDimensions.height
    
    return {
      left: cursorPos.x * scaleX,
      top: cursorPos.y * scaleY,
    }
  }

  const getScreenCoordinates = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    // Get natural image dimensions
    const scaleX = canvasRef.current.naturalWidth / rect.width
    const scaleY = canvasRef.current.naturalHeight / rect.height
    
    return {
      x: Math.round(x * scaleX),
      y: Math.round(y * scaleY)
    }
  }

  const sendMouseControl = (action: string, event: React.MouseEvent<HTMLImageElement>) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    
    const coords = getScreenCoordinates(event)
    
    ws.send(JSON.stringify({
      type: "mouse_control",
      device_id: deviceId,
      data: {
        action: action,
        x: coords.x,
        y: coords.y
      }
    }))
  }

  const handleMouseClick = (event: React.MouseEvent<HTMLImageElement>) => {
    event.preventDefault()
    sendMouseControl("leftclick", event)
  }

  const handleRightClick = (event: React.MouseEvent<HTMLImageElement>) => {
    event.preventDefault()
    sendMouseControl("rightclick", event)
  }

  const handleDoubleClick = (event: React.MouseEvent<HTMLImageElement>) => {
    event.preventDefault()
    sendMouseControl("doubleclick", event)
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLImageElement>) => {
    sendMouseControl("move", event)
  }

  const sendKeyboardControl = (key: number, text?: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    
    ws.send(JSON.stringify({
      type: "keyboard_control",
      device_id: deviceId,
      data: {
        action: "keypress",
        key: key,
        text: text || ""
      }
    }))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    
    // Map special keys to virtual key codes
    const keyMap: { [key: string]: number } = {
      'Backspace': 0x08,
      'Tab': 0x09,
      'Enter': 0x0D,
      'Shift': 0x10,
      'Control': 0x11,
      'Alt': 0x12,
      'Escape': 0x1B,
      ' ': 0x20,
      'ArrowLeft': 0x25,
      'ArrowUp': 0x26,
      'ArrowRight': 0x27,
      'ArrowDown': 0x28,
      'Delete': 0x2E
    }
    
    const vkCode = keyMap[event.key] || event.key.toUpperCase().charCodeAt(0)
    sendKeyboardControl(vkCode, event.key)
  }

  const sendWindowControl = (action: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    
    ws.send(JSON.stringify({
      type: "window_control",
      device_id: deviceId,
      data: {
        action: action
      }
    }))
  }

  const handleMaximize = () => {
    sendWindowControl("maximize")
  }

  const handleMinimize = () => {
    sendWindowControl("minimize")
  }

  const handleRestore = () => {
    sendWindowControl("restore")
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Listen for escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Remote Screen
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
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  className={`text-slate-200 hover:bg-slate-700 ${showCursor ? 'bg-slate-700' : ''}`}
                  onClick={() => setShowCursor(!showCursor)}
                >
                  <div className="flex justify-between w-full">
                    <span>Show Cursor</span>
                    <span className="text-slate-400 text-xs">{showCursor ? 'On' : 'Off'}</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <p className="mb-4 text-sm text-slate-500">Start streaming to view the remote desktop</p>
                <Button onClick={handleStartStream} className="bg-blue-600 hover:bg-blue-700">
                  <Monitor className="mr-2 h-4 w-4" />
                  Start Screen Stream
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full bg-slate-950">
              {controlEnabled && screenImage && (
                <div className="absolute top-4 right-4 z-10 bg-green-600/90 text-white px-3 py-2 rounded-md font-semibold flex items-center gap-2">
                  <MousePointer className="h-4 w-4 animate-pulse" />
                  CONTROL ACTIVE
                </div>
              )}
              {/* Window Control Buttons */}
              {screenImage && (
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 bg-slate-900/90 text-white hover:bg-slate-800"
                    onClick={handleMaximize}
                    title="Maximize Remote Window"
                  >
                    <Maximize className="mr-1 h-4 w-4" />
                    Maximize
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 bg-slate-900/90 text-white hover:bg-slate-800"
                    onClick={handleMinimize}
                    title="Minimize Remote Window"
                  >
                    <Minimize2 className="mr-1 h-4 w-4" />
                    Minimize
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 bg-slate-900/90 text-white hover:bg-slate-800"
                    onClick={handleRestore}
                    title="Restore Remote Window"
                  >
                    <Monitor className="mr-1 h-4 w-4" />
                    Restore
                  </Button>
                </div>
              )}
              {screenImage ? (
                <div className="relative w-full h-full">
                  <img 
                    ref={canvasRef}
                    src={screenImage} 
                    alt="Screen capture" 
                    className={`w-full h-full object-contain ${controlEnabled ? 'cursor-crosshair' : ''}`}
                    onClick={controlEnabled ? handleMouseClick : undefined}
                    onContextMenu={controlEnabled ? handleRightClick : undefined}
                    onDoubleClick={controlEnabled ? handleDoubleClick : undefined}
                    onMouseMove={controlEnabled ? handleMouseMove : undefined}
                  />
                  {/* Remote cursor overlay */}
                  {showCursor && cursorPos && screenDimensions && (
                    <div
                      className="absolute pointer-events-none z-20 transition-all duration-75"
                      style={getCursorStyle()}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
                        <path
                          d="M5.5 3.21V20.79C5.5 21.16 5.84 21.43 6.19 21.33L11.38 19.71L14.16 26.14C14.29 26.45 14.65 26.58 14.96 26.45L17.29 25.42C17.6 25.29 17.73 24.93 17.6 24.62L14.82 18.19L20.01 16.57C20.36 16.47 20.5 16.03 20.25 15.77L6.67 2.19C6.27 1.79 5.5 2.04 5.5 2.63V3.21Z"
                          fill="#ffffff"
                          stroke="#000000"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4 h-24 w-24 mx-auto rounded-full bg-blue-600/10 flex items-center justify-center">
                      <Monitor className="h-12 w-12 text-blue-500 animate-pulse" />
                    </div>
                    <p className="text-slate-400 mb-4">Connecting to screen stream...</p>
                  </div>
                </div>
              )}
              {screenImage && (
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
              )}
            </div>
          )}
        </div>
        {controlEnabled && isStreaming && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
              <p className="text-sm text-blue-400 flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                Remote control is enabled. Click on the screen to control mouse. Type below for keyboard input.
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
              <label className="text-xs text-slate-400 mb-2 block">Keyboard Input:</label>
              <Input
                type="text"
                placeholder="Type here to send keyboard input to remote desktop..."
                className="border-slate-700 bg-slate-950 text-white font-mono"
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
              <p className="text-xs text-slate-500 mt-2">Click on screen for mouse control, type here for keyboard input</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
