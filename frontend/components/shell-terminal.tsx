"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Terminal as TerminalIcon, Trash2, Download, Maximize2, Minimize2, Expand } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { API_ENDPOINTS } from "@/lib/api-config"
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface ShellTerminalProps {
  deviceId: string
  userId: string
}

export function ShellTerminal({ deviceId, userId }: ShellTerminalProps) {
  const [shellType, setShellType] = useState<"powershell" | "cmd">("powershell")
  const [isMaximized, setIsMaximized] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const terminalContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Initialize xterm.js terminal
  useEffect(() => {
    if (!terminalContainerRef.current || terminalRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#e0e0e0',
        cursor: '#00ff00',
        black: '#000000',
        red: '#ff0000',
        green: '#00ff00',
        yellow: '#ffff00',
        blue: '#0000ff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#ffffff',
        brightBlack: '#808080',
        brightRed: '#ff8080',
        brightGreen: '#80ff80',
        brightYellow: '#ffff80',
        brightBlue: '#8080ff',
        brightMagenta: '#ff80ff',
        brightCyan: '#80ffff',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalContainerRef.current)
    
    // Initial fit
    setTimeout(() => {
      fitAddon.fit()
    }, 0)

    // Handle terminal input
    term.onData((data) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send input directlyto backend
        ws.send(JSON.stringify({
          type: 'shell_command',
          device_id: deviceId,
          data: {
            session_id: deviceId,
            command: data,
            shell_type: shellType
          }
        }))
      }
    })

    terminalRef.current = term
    fitAddonRef.current = fitAddon

    // Welcome message
    term.writeln('\x1b[36mDWS Remote Terminal - ConPTY Enabled\x1b[0m')
    term.writeln('\x1b[90mFull Windows PowerShell/CMD support with ANSI colors\x1b[0m')
    term.writeln('')

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
        
        // Send resize to backend
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'shell_resize',
            device_id: deviceId,
            data: {
              session_id: deviceId,
              cols: terminalRef.current.cols,
              rows: terminalRef.current.rows
            }
          }))
        }
      }
    })

    if (terminalContainerRef.current) {
      resizeObserver.observe(terminalContainerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      term.dispose()
    }
  }, [])

  // WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      console.log("💻 Shell terminal WebSocket connected")
      setWs(websocket)
      setIsConnected(true)
      
      if (terminalRef.current) {
        terminalRef.current.writeln('\x1b[32m✓ Connected to remote device\x1b[0m')
        terminalRef.current.writeln('')
      }
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'shell_response' && message.device_id === deviceId) {
        console.log("💻 Shell output received")
        
        if (message.data && message.data.success && message.data.data) {
          const output = message.data.data.output || ''
          
          // Write output with VT sequences directly
          if (terminalRef.current && output) {
            terminalRef.current.write(output)
          }
        } else if (message.data && !message.data.success) {
          if (terminalRef.current) {
            terminalRef.current.writeln(`\x1b[31mError: ${message.data.message || 'Command failed'}\x1b[0m`)
          }
        }
      } else if (message.type === 'error') {
        if (message.data?.message && terminalRef.current) {
          terminalRef.current.writeln(`\x1b[31mError: ${message.data.message}\x1b[0m`)
        }
      }
    }

    websocket.onerror = (error) => {
      console.error("Shell WebSocket error:", error)
      setIsConnected(false)
      if (terminalRef.current) {
        terminalRef.current.writeln('\x1b[31m✗ Connection error\x1b[0m')
      }
    }

    websocket.onclose = () => {
      setIsConnected(false)
      if (terminalRef.current) {
        terminalRef.current.writeln('\x1b[33m⚠ Connection closed\x1b[0m')
      }
    }

    return () => {
      websocket.close()
    }
  }, [deviceId])

  // Fit terminal on resize
  useEffect(() => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit()
    }
  }, [isMaximized, isFullScreen])

  const handleShellSwitch = (newShellType: "powershell" | "cmd") => {
    if (newShellType === shellType) return
    
    setShellType(newShellType)
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'switch_shell',
        device_id: deviceId,
        data: {
          session_id: deviceId,
          shell_type: newShellType
        }
      }))
    }
    
    if (terminalRef.current) {
      terminalRef.current.clear()
      terminalRef.current.writeln(`\x1b[36mSwitched to ${newShellType.toUpperCase()}\x1b[0m`)
      terminalRef.current.writeln('')
    }
    
    toast({
      title: "Shell Switched",
      description: `Now using ${newShellType.toUpperCase()}`
    })
  }

  const clearTerminal = () => {
    if (terminalRef.current) {
      terminalRef.current.clear()
    }
    toast({
      title: "Success",
      description: "Terminal cleared",
    })
  }

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized)
    if (isFullScreen) setIsFullScreen(false)
  }

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
    if (isMaximized) setIsMaximized(false)
  }

  const exportHistory = () => {
    // Get terminal buffer content
    if (!terminalRef.current) return
    
    const buffer = terminalRef.current.buffer.active
    let content = ''
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i)
      if (line) {
        content += line.translateToString(true) + '\n'
      }
    }

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `terminal-${shellType}-${new Date().toISOString()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Success",
      description: "Terminal history exported",
    })
  }

  return (
    <Card className={`border-slate-800 bg-slate-900/50 ${isFullScreen ? 'fixed inset-0 z-50 rounded-none overflow-auto' : isMaximized ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <TerminalIcon className="h-5 w-5" />
            Remote Terminal {isConnected && <span className="text-xs text-green-400">● ConPTY</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              onClick={toggleMaximize}
              title={isMaximized ? "Restore" : "Expand"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-slate-700 text-white hover:bg-slate-700 ${isFullScreen ? 'bg-blue-600 border-blue-600' : 'bg-slate-800'}`}
              onClick={toggleFullScreen}
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              <Expand className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              onClick={exportHistory}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-700 bg-red-950/20 text-red-400 hover:bg-red-950/40"
              onClick={clearTerminal}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={shellType} onValueChange={(value) => handleShellSwitch(value as "powershell" | "cmd")}>
          <TabsList className="mb-4 bg-slate-800 border border-slate-700">
            <TabsTrigger
              value="powershell"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              <TerminalIcon className="mr-2 h-4 w-4" />
              PowerShell
            </TabsTrigger>
            <TabsTrigger
              value="cmd"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              <TerminalIcon className="mr-2 h-4 w-4" />
              CMD
            </TabsTrigger>
          </TabsList>

          <TabsContent value={shellType} className="space-y-4">
            <div
              ref={terminalContainerRef}
              className={`font-mono text-sm bg-slate-950 border border-slate-800 rounded-lg overflow-hidden ${isFullScreen ? 'h-[calc(100vh-180px)]' : isMaximized ? 'h-[calc(100vh-240px)]' : 'h-[500px]'}`}
            />

            <div className="text-xs text-slate-500 space-y-1">
              <p>
                <strong className="text-slate-400">Full Windows terminal support</strong> • ANSI colors • VT sequences • Interactive commands
              </p>
              <p>
                Powered by <strong className="text-blue-400">ConPTY</strong> (Windows Pseudo Console)
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
