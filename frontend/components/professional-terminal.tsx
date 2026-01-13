"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { 
  Trash2, 
  Download, 
  Maximize2, 
  Minimize2, 
  Expand, 
  Shrink,
  Copy,
  Wifi,
  WifiOff,
  Play,
  Square,
  MoreVertical
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { API_ENDPOINTS } from "@/lib/api-config"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import '@xterm/xterm/css/xterm.css'

interface ProfessionalTerminalProps {
  deviceId: string
  userId: string
}

// PowerShell theme
const powershellTheme = {
  background: '#012456',
  foreground: '#eeedf0',
  cursor: '#f0f0f0',
  cursorAccent: '#012456',
  selectionBackground: '#264f78',
  black: '#0c0c0c',
  red: '#c50f1f',
  green: '#13a10e',
  yellow: '#c19c00',
  blue: '#0037da',
  magenta: '#881798',
  cyan: '#3a96dd',
  white: '#cccccc',
  brightBlack: '#767676',
  brightRed: '#e74856',
  brightGreen: '#16c60c',
  brightYellow: '#f9f1a5',
  brightBlue: '#3b78ff',
  brightMagenta: '#b4009e',
  brightCyan: '#61d6d6',
  brightWhite: '#f2f2f2',
}

// CMD theme  
const cmdTheme = {
  background: '#0c0c0c',
  foreground: '#cccccc',
  cursor: '#f0f0f0',
  cursorAccent: '#0c0c0c',
  selectionBackground: '#264f78',
  black: '#0c0c0c',
  red: '#c50f1f',
  green: '#13a10e',
  yellow: '#c19c00',
  blue: '#0037da',
  magenta: '#881798',
  cyan: '#3a96dd',
  white: '#cccccc',
  brightBlack: '#767676',
  brightRed: '#e74856',
  brightGreen: '#16c60c',
  brightYellow: '#f9f1a5',
  brightBlue: '#3b78ff',
  brightMagenta: '#b4009e',
  brightCyan: '#61d6d6',
  brightWhite: '#f2f2f2',
}

export function ProfessionalTerminal({ deviceId, userId }: ProfessionalTerminalProps) {
  const [shellType, setShellType] = useState<"powershell" | "cmd">("powershell")
  const [isConnected, setIsConnected] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [currentDir, setCurrentDir] = useState("")
  const [copied, setCopied] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstance = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)
  const currentDirRef = useRef<string>("")
  const { toast } = useToast()

  // Get current theme
  const currentTheme = shellType === "powershell" ? powershellTheme : cmdTheme

  // Browser fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!isFullScreen && containerRef.current) {
      containerRef.current.requestFullscreen?.()
      setIsFullScreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullScreen(false)
    }
  }, [isFullScreen])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement
      setIsFullScreen(isFs)
      setTimeout(() => fitAddon.current?.fit(), 100)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Initialize Terminal
  useEffect(() => {
    if (!terminalRef.current || terminalInstance.current) return

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: "Cascadia Mono, Consolas, 'Courier New', monospace",
      theme: currentTheme,
      scrollback: 10000,
      allowProposedApi: true,
      convertEol: true,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(terminalRef.current)
    
    setTimeout(() => fit.fit(), 0)

    terminalInstance.current = term
    fitAddon.current = fit

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => fit.fit(), 50)
    })
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      term.dispose()
    }
  }, [])

  // Update theme when shell changes
  useEffect(() => {
    if (terminalInstance.current) {
      terminalInstance.current.options.theme = currentTheme
    }
  }, [shellType, currentTheme])

  // Sync currentDir to ref
  useEffect(() => {
    currentDirRef.current = currentDir
  }, [currentDir])

  // Helper functions
  const writePrompt = useCallback(() => {
    if (!terminalInstance.current) return
    const dir = currentDirRef.current || "~"
    const prompt = shellType === "powershell" 
      ? `\x1b[33mPS ${dir}>\x1b[0m `
      : `${dir}>`
    terminalInstance.current.write(prompt)
  }, [shellType])

  const executeCommand = useCallback((command: string) => {
    if (!command || !ws || ws.readyState !== WebSocket.OPEN) {
      writePrompt()
      return
    }

    if (command.toLowerCase() === "clear" || command.toLowerCase() === "cls") {
      terminalInstance.current?.clear()
      writePrompt()
      return
    }

    ws.send(JSON.stringify({
      type: "shell_command",
      device_id: deviceId,
      data: { session_id: deviceId, command, shell_type: shellType }
    }))
  }, [ws, deviceId, shellType, writePrompt])

  const handleShellResponse = useCallback((data: any) => {
    if (!terminalInstance.current) return
    const term = terminalInstance.current

    if (data?.success && data?.data) {
      if (data.data.working_dir) {
        setCurrentDir(data.data.working_dir)
      }
      if (data.data.output) {
        const output = data.data.output.trim()
        if (output) {
          output.split('\n').forEach((line: string) => {
            term.writeln(line.replace(/\r/g, ''))
          })
        }
      }
    } else {
      term.writeln(`\x1b[31m✗ ${data?.message || 'Command failed'}\x1b[0m`)
    }
    writePrompt()
  }, [writePrompt])

  // WebSocket connection
  useEffect(() => {
    if (!terminalInstance.current) {
      console.warn('⚠️ Terminal instance not ready for WebSocket connection')
      return
    }

    console.log('🔌 Establishing WebSocket connection to:', API_ENDPOINTS.ws)
    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      console.log('💻 Terminal WebSocket connected')
      setWs(websocket)
      setIsConnected(true)
      
      if (terminalInstance.current) {
        if (shellType === "powershell") {
          terminalInstance.current.writeln('\x1b[36mWindows PowerShell\x1b[0m')
          terminalInstance.current.writeln('\x1b[90mCopyright (C) Microsoft Corporation.\x1b[0m')
        } else {
          terminalInstance.current.writeln('Microsoft Windows [Version 10.0.22631]')
          terminalInstance.current.writeln('(c) Microsoft Corporation.')
        }
        terminalInstance.current.writeln('')
        writePrompt()
      } else {
        console.error('❌ Terminal instance lost after connection')
      }
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      // Check if this message is for our device
      if (message.device_id && message.device_id !== deviceId) {
        return // Ignore messages for other devices
      }
      
      if (message.type === "shell_response") {
        handleShellResponse(message.data)
      } else if (message.type === "switch_shell_response") {
        if (message.data?.success && message.data?.data?.working_dir) {
          setCurrentDir(message.data.data.working_dir)
        }
      } else if (message.type === "error" && message.data?.message) {
        terminalInstance.current?.writeln(`\r\n\x1b[31m✗ ${message.data.message}\x1b[0m`)
        writePrompt()
      }
    }

    websocket.onerror = (error) => {
      console.error('Terminal WebSocket error:', error)
      console.error('WebSocket state:', websocket.readyState)
      console.error('API_ENDPOINTS.ws:', API_ENDPOINTS.ws)
      setIsConnected(false)
      if (terminalInstance.current && websocket.readyState === WebSocket.OPEN) {
        terminalInstance.current.writeln('\r\n\x1b[31m✗ Connection error\x1b[0m')
      }
    }

    websocket.onclose = (event) => {
      setIsConnected(false)
      if (terminalInstance.current && event.code !== 1000 && event.wasClean === false) {
        terminalInstance.current.writeln('\r\n\x1b[33m⚠ Disconnected\x1b[0m')
      }
    }

    return () => {
      if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
        websocket.close(1000, 'Component unmounting')
      }
    }
  }, [shellType, deviceId, handleShellResponse, writePrompt])

  // Handle terminal input
  useEffect(() => {
    if (!terminalInstance.current) {
      console.warn('⚠️ Terminal instance not ready for input handling')
      return
    }
    
    if (!ws) {
      console.log('⏳ Waiting for WebSocket connection before setting up input handler')
      return
    }

    console.log('⌨️ Setting up terminal input handler')
    let commandBuffer = ""

    const handleData = (data: string) => {
      const term = terminalInstance.current
      if (!term) {
        console.warn('⚠️ Terminal lost during input')
        return
      }
      
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('⚠️ WebSocket not ready, state:', ws?.readyState)
        return
      }

      const code = data.charCodeAt(0)

      if (code === 13) { // Enter
        term.write("\r\n")
        executeCommand(commandBuffer.trim())
        commandBuffer = ""
      } else if (code === 127) { // Backspace
        if (commandBuffer.length > 0) {
          commandBuffer = commandBuffer.slice(0, -1)
          term.write("\b \b")
        }
      } else if (code === 3) { // Ctrl+C
        term.writeln("^C")
        commandBuffer = ""
        writePrompt()
      } else if (code === 12) { // Ctrl+L
        term.clear()
        writePrompt()
      } else if (code >= 32) {
        commandBuffer += data
        term.write(data)
      }
    }

    const disposable = terminalInstance.current.onData(handleData)
    return () => disposable.dispose()
  }, [ws, executeCommand, shellType, writePrompt])

  const handleShellSwitch = (newShellType: "powershell" | "cmd") => {
    if (newShellType === shellType) return
    
    setShellType(newShellType)
    setCurrentDir("")
    
    if (terminalInstance.current) {
      terminalInstance.current.clear()
      if (newShellType === "powershell") {
        terminalInstance.current.writeln('\x1b[36mWindows PowerShell\x1b[0m')
      } else {
        terminalInstance.current.writeln('Microsoft Windows [Version 10.0.22631]')
      }
      terminalInstance.current.writeln('')
      writePrompt()
    }
    
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "switch_shell",
        device_id: deviceId,
        data: { session_id: deviceId, shell_type: newShellType }
      }))
    }
  }

  const clearTerminal = () => {
    terminalInstance.current?.clear()
    writePrompt()
  }

  const copyOutput = async () => {
    const selection = terminalInstance.current?.getSelection()
    if (selection) {
      await navigator.clipboard.writeText(selection)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: "Copied", description: "Selection copied" })
    }
  }

  const exportSession = () => {
    if (!terminalInstance.current) return
    const buffer = terminalInstance.current.buffer.active
    let content = ''
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i)
      if (line) content += line.translateToString(true) + '\n'
    }
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `terminal-${shellType}-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Compact Toolbar */}
      <div className={`flex items-center h-10 px-3 shrink-0 rounded-t-lg border-b ${
        shellType === "powershell" 
          ? 'bg-[#001e3d] border-[#003366]' 
          : 'bg-[#1a1a1a] border-[#333]'
      }`}>
        {/* Left - Shell tabs & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-black/20 rounded p-0.5">
            <button
              onClick={() => handleShellSwitch("powershell")}
              className={`h-6 px-2 text-[11px] font-medium rounded transition-all ${
                shellType === "powershell"
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PS
            </button>
            <button
              onClick={() => handleShellSwitch("cmd")}
              className={`h-6 px-2 text-[11px] font-medium rounded transition-all ${
                shellType === "cmd"
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CMD
            </button>
          </div>

          <div className={`flex items-center gap-1.5 text-[10px] ${isConnected ? 'text-green-400' : 'text-slate-500'}`}>
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
        
        <div className="flex-1" />
        
        {/* Right - Actions */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={copyOutput}
            title="Copy selection"
          >
            {copied ? <Copy className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={clearTerminal}
            title="Clear"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={exportSession}
            title="Export"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={toggleFullscreen}
            title={isFullScreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullScreen ? <Shrink className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Terminal window */}
      <div className={`flex-1 flex flex-col min-h-0 ${
        shellType === "powershell" ? 'bg-[#012456]' : 'bg-[#0c0c0c]'
      } rounded-b-lg overflow-hidden`}>
        {/* Terminal content - fills available space */}
        <div className="flex-1 min-h-0" style={{ minHeight: '400px' }}>
          <div
            ref={terminalRef}
            className={`w-full h-full p-2 ${
              shellType === "powershell" ? 'bg-[#012456]' : 'bg-[#0c0c0c]'
            }`}
          />
        </div>
      </div>
    </div>
  )
}
