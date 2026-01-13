"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Terminal as TerminalIcon, Trash2, Download, Maximize2, Minimize2, X, Minus, Square, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { API_ENDPOINTS } from "@/lib/api-config"
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface ShellTerminalProps {
  deviceId: string
  userId: string
}

// PowerShell theme - authentic Windows PowerShell colors
const powershellTheme = {
  background: '#012456',
  foreground: '#eeedf0',
  cursor: '#f0f0f0',
  cursorAccent: '#012456',
  selectionBackground: '#264f78',
  selectionForeground: '#ffffff',
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

// CMD theme - authentic Windows Command Prompt colors
const cmdTheme = {
  background: '#0c0c0c',
  foreground: '#cccccc',
  cursor: '#f0f0f0',
  cursorAccent: '#0c0c0c',
  selectionBackground: '#264f78',
  selectionForeground: '#ffffff',
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

export function ShellTerminal({ deviceId, userId }: ShellTerminalProps) {
  const [shellType, setShellType] = useState<"powershell" | "cmd">("powershell")
  const [isMaximized, setIsMaximized] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [commandBuffer, setCommandBuffer] = useState("")
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [copied, setCopied] = useState(false)
  
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const terminalContainerRef = useRef<HTMLDivElement>(null)
  const mainContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Browser fullscreen API
  const toggleFullscreen = useCallback(() => {
    if (!isFullScreen && mainContainerRef.current) {
      mainContainerRef.current.requestFullscreen?.();
      setIsFullScreen(true)
    } else {
      document.exitFullscreen?.();
      setIsFullScreen(false)
    }
  }, [isFullScreen])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement
      setIsFullScreen(isFs)
      // Refit terminal after fullscreen change
      setTimeout(() => fitAddonRef.current?.fit(), 100)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Get current theme based on shell type
  const currentTheme = shellType === "powershell" ? powershellTheme : cmdTheme

  // Initialize xterm.js terminal
  useEffect(() => {
    if (!terminalContainerRef.current || terminalRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Cascadia Mono, Consolas, "Courier New", monospace',
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: currentTheme,
      allowProposedApi: true,
      scrollback: 10000,
      tabStopWidth: 8,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalContainerRef.current)
    
    // Initial fit
    setTimeout(() => {
      fitAddon.fit()
    }, 0)

    // Handle terminal input - support both typing and paste
    term.onData((data) => {
      // Check if this is a paste (multiple characters at once)
      if (data.length > 1) {
        // Handle pasted content - filter out control characters except newlines
        // Replace newlines with semicolons for Windows shell compatibility (execute as single command)
        let cleanData = data
          .replace(/\r\n/g, '\n')  // Normalize newlines
          .replace(/\r/g, '\n')    // Handle bare \r
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('@echo'))  // Remove empty lines and @echo off
          .join(' & ')  // Join with & for Windows cmd/powershell
        
        if (cleanData) {
          setCommandBuffer(prev => prev + cleanData)
          term.write(cleanData)
        }
        return
      }
      
      // Handle single character input
      if (data === '\r') {
        // Enter pressed - send command
        term.write('\r\n')
        if (commandBuffer.trim()) {
          sendCommand(commandBuffer)
          setCommandHistory(prev => [...prev, commandBuffer])
          setHistoryIndex(-1)
        } else {
          // Empty command - just show prompt again
          writePrompt(term)
        }
        setCommandBuffer("")
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (commandBuffer.length > 0) {
          setCommandBuffer(prev => prev.slice(0, -1))
          term.write('\b \b')
        }
      } else if (data === '\x1b[A') {
        // Up arrow - history navigation
        if (commandHistory.length > 0) {
          const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
          setHistoryIndex(newIndex)
          const cmd = commandHistory[commandHistory.length - 1 - newIndex]
          if (cmd) {
            // Clear current input
            term.write('\r' + getPrompt() + ' '.repeat(commandBuffer.length))
            term.write('\r' + getPrompt())
            term.write(cmd)
            setCommandBuffer(cmd)
          }
        }
      } else if (data === '\x1b[B') {
        // Down arrow - history navigation
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1
          setHistoryIndex(newIndex)
          const cmd = commandHistory[commandHistory.length - 1 - newIndex]
          if (cmd) {
            term.write('\r' + getPrompt() + ' '.repeat(commandBuffer.length))
            term.write('\r' + getPrompt())
            term.write(cmd)
            setCommandBuffer(cmd)
          }
        } else if (historyIndex === 0) {
          setHistoryIndex(-1)
          term.write('\r' + getPrompt() + ' '.repeat(commandBuffer.length))
          term.write('\r' + getPrompt())
          setCommandBuffer("")
        }
      } else if (data === '\x03') {
        // Ctrl+C
        term.write('^C\r\n')
        setCommandBuffer("")
        writePrompt(term)
      } else if (data === '\x16') {
        // Ctrl+V - paste from clipboard
        navigator.clipboard.readText().then(text => {
          if (text) {
            const lines = text.split(/\r?\n/)
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i]
              if (i === lines.length - 1) {
                if (line) {
                  setCommandBuffer(prev => prev + line)
                  term.write(line)
                }
              } else {
                const fullCommand = commandBuffer + line
                if (fullCommand.trim()) {
                  term.write(line + '\r\n')
                  sendCommand(fullCommand)
                  setCommandHistory(prev => [...prev, fullCommand])
                } else {
                  term.write('\r\n')
                  writePrompt(term)
                }
                setCommandBuffer("")
              }
            }
          }
        }).catch(() => {
          // Clipboard access denied - fall through to normal handling
        })
      } else if (data >= ' ' && data <= '~') {
        // Normal printable character
        setCommandBuffer(prev => prev + data)
        term.write(data)
      }
    })

    terminalRef.current = term
    fitAddonRef.current = fitAddon

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
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

  // Update terminal theme when shell type changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = currentTheme
    }
  }, [shellType])

  // Helper functions
  const getPrompt = useCallback(() => {
    if (shellType === "powershell") {
      return '\x1b[33mPS C:\\Users>\x1b[0m '
    } else {
      return 'C:\\Users>'
    }
  }, [shellType])

  const writePrompt = useCallback((term: Terminal) => {
    term.write(getPrompt())
  }, [getPrompt])

  const sendCommand = useCallback((command: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'shell_command',
        device_id: deviceId,
        data: {
          session_id: deviceId,
          command: command,
          shell_type: shellType
        }
      }))
    }
  }, [ws, deviceId, shellType])

  // WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      console.log("💻 Shell terminal WebSocket connected")
      setWs(websocket)
      setIsConnected(true)
      
      if (terminalRef.current) {
        // Write welcome message
        if (shellType === "powershell") {
          terminalRef.current.writeln('\x1b[36mWindows PowerShell\x1b[0m')
          terminalRef.current.writeln('\x1b[90mCopyright (C) Microsoft Corporation. All rights reserved.\x1b[0m')
          terminalRef.current.writeln('')
          terminalRef.current.writeln('\x1b[90mRemote session established to \x1b[32m' + deviceId + '\x1b[0m')
        } else {
          terminalRef.current.writeln('Microsoft Windows [Version 10.0.22631]')
          terminalRef.current.writeln('(c) Microsoft Corporation. All rights reserved.')
          terminalRef.current.writeln('')
        }
        terminalRef.current.writeln('')
        writePrompt(terminalRef.current)
      }
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'shell_response' && message.device_id === deviceId) {
        if (message.data && message.data.success && message.data.data) {
          const output = message.data.data.output || ''
          const workingDir = message.data.data.working_dir || ''
          
          if (terminalRef.current && output) {
            // Write output
            terminalRef.current.write(output)
            if (!output.endsWith('\n') && !output.endsWith('\r')) {
              terminalRef.current.write('\r\n')
            }
          }
          
          // Write new prompt
          if (terminalRef.current) {
            writePrompt(terminalRef.current)
          }
        } else if (message.data && !message.data.success) {
          if (terminalRef.current) {
            terminalRef.current.writeln(`\x1b[31m${message.data.message || 'Command failed'}\x1b[0m`)
            writePrompt(terminalRef.current)
          }
        }
      } else if (message.type === 'switch_shell_response' && message.device_id === deviceId) {
        if (terminalRef.current) {
          writePrompt(terminalRef.current)
        }
      }
    }

    websocket.onerror = (error) => {
      console.error("Shell WebSocket error:", error)
      setIsConnected(false)
    }

    websocket.onclose = (event) => {
      setIsConnected(false)
      if (terminalRef.current && event.code !== 1000 && event.wasClean === false) {
        terminalRef.current.writeln('')
        terminalRef.current.writeln('\x1b[31mConnection closed\x1b[0m')
      }
    }

    return () => {
      if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
        websocket.close(1000, 'Component unmounting')
      }
    }
  }, [deviceId, shellType, writePrompt])

  // Fit terminal on resize
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 100)
    }
  }, [isMaximized, isFullScreen])

  const handleShellSwitch = (newShellType: "powershell" | "cmd") => {
    if (newShellType === shellType) return
    
    setShellType(newShellType)
    setCommandBuffer("")
    setCommandHistory([])
    setHistoryIndex(-1)
    
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
      
      // Write new welcome message
      if (newShellType === "powershell") {
        terminalRef.current.writeln('\x1b[36mWindows PowerShell\x1b[0m')
        terminalRef.current.writeln('\x1b[90mCopyright (C) Microsoft Corporation. All rights reserved.\x1b[0m')
        terminalRef.current.writeln('')
        terminalRef.current.writeln('\x1b[90mRemote session established to \x1b[32m' + deviceId + '\x1b[0m')
      } else {
        terminalRef.current.writeln('Microsoft Windows [Version 10.0.22631]')
        terminalRef.current.writeln('(c) Microsoft Corporation. All rights reserved.')
      }
      terminalRef.current.writeln('')
      writePrompt(terminalRef.current)
    }
  }

  const clearTerminal = () => {
    if (terminalRef.current) {
      terminalRef.current.clear()
      writePrompt(terminalRef.current)
    }
  }

  const copyOutput = async () => {
    if (!terminalRef.current) return
    
    const buffer = terminalRef.current.buffer.active
    let content = ''
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i)
      if (line) {
        content += line.translateToString(true) + '\n'
      }
    }
    
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    
    toast({
      title: "Copied",
      description: "Terminal output copied to clipboard",
    })
  }

  const exportHistory = () => {
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
    a.download = `terminal-${shellType}-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Exported",
      description: "Terminal session saved",
    })
  }

  return (
    <div ref={mainContainerRef} className="flex flex-col h-full">
      {/* Compact top bar with tabs and actions */}
      <div className={`flex items-center h-9 px-2 shrink-0 ${
        shellType === "powershell" ? 'bg-[#001e3d]' : 'bg-[#1a1a1a]'
      } rounded-t-lg border-b ${shellType === "powershell" ? 'border-[#003366]' : 'border-[#333]'}`}>
        
        {/* Shell tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleShellSwitch("powershell")}
            className={`flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium rounded transition-all ${
              shellType === "powershell"
                ? 'bg-[#012456] text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-blue-400 font-bold">PS</span>
            <span className="hidden sm:inline">PowerShell</span>
          </button>
          <button
            onClick={() => handleShellSwitch("cmd")}
            className={`flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium rounded transition-all ${
              shellType === "cmd"
                ? 'bg-[#0c0c0c] text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-slate-400 font-bold">&gt;_</span>
            <span className="hidden sm:inline">CMD</span>
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 ml-3">
          {isConnected && (
            <div className="flex items-center gap-1 text-[10px] text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="hidden sm:inline">Connected</span>
            </div>
          )}
        </div>
        
        <div className="flex-1" />
        
        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={copyOutput}
            className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            onClick={clearTerminal}
            className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={exportHistory}
            className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Export"
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title={isFullScreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullScreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Terminal window */}
      <div className={`flex-1 flex flex-col min-h-0 ${
        shellType === "powershell" ? 'bg-[#012456]' : 'bg-[#0c0c0c]'
      } rounded-b-lg overflow-hidden`}>

        {/* Terminal content - fills available space */}
        <div className="flex-1 min-h-0">
          <div
            ref={terminalContainerRef}
            className={`w-full h-full p-2 ${
              shellType === "powershell" ? 'bg-[#012456]' : 'bg-[#0c0c0c]'
            }`}
          />
        </div>
      </div>
    </div>
  )
}
