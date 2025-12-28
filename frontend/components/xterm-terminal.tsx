"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Terminal, Trash2, Power } from "lucide-react"
import { API_ENDPOINTS } from "@/lib/api-config"
import { Terminal as XTerm } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "@xterm/xterm/css/xterm.css"

interface XtermTerminalProps {
  deviceId: string
  userId: string
}

export function XtermTerminal({ deviceId, userId }: XtermTerminalProps) {
  const [shellType, setShellType] = useState<"powershell" | "cmd">("powershell")
  const [isConnected, setIsConnected] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const commandBufferRef = useRef<string>("")

  useEffect(() => {
    if (!terminalRef.current) return

    // Initialize XTerm
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: "#0a0e1a",
        foreground: "#e2e8f0",
        cursor: "#3b82f6",
        black: "#1e293b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#cbd5e1",
        brightBlack: "#475569",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#f1f5f9",
      },
      cols: 80,
      rows: 24,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Welcome message
    term.writeln("\x1b[1;36m╔══════════════════════════════════════════╗\x1b[0m")
    term.writeln("\x1b[1;36m║   Remote Terminal - Xterm.js Powered    ║\x1b[0m")
    term.writeln("\x1b[1;36m╚══════════════════════════════════════════╝\x1b[0m")
    term.writeln("")
    term.writeln(`\x1b[1;33m${shellType === "powershell" ? "PowerShell" : "Command Prompt"} Mode\x1b[0m`)
    term.writeln("\x1b[90mConnecting to remote shell...\x1b[0m")
    term.writeln("")

    // Handle user input
    term.onData((data) => {
      if (data === "\r") {
        // Enter key pressed
        term.write("\r\n")
        const command = commandBufferRef.current
        if (command.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
          executeCommand(command, term)
        }
        commandBufferRef.current = ""
      } else if (data === "\x7f") {
        // Backspace
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1)
          term.write("\b \b")
        }
      } else if (data === "\x03") {
        // Ctrl+C
        term.write("^C\r\n")
        commandBufferRef.current = ""
      } else {
        // Regular character
        commandBufferRef.current += data
        term.write(data)
      }
    })

    // Resize handler
    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      term.dispose()
    }
  }, [terminalRef.current])

  useEffect(() => {
    // Connect to WebSocket
    const websocket = new WebSocket(API_ENDPOINTS.ws)
    wsRef.current = websocket

    websocket.onopen = () => {
      console.log("💻 Shell terminal WebSocket connected")
      setIsConnected(true)
      if (xtermRef.current) {
        xtermRef.current.writeln("\x1b[32m✓ Connected to remote shell\x1b[0m")
        xtermRef.current.writeln("")
        xtermRef.current.write("\x1b[1;34m$\x1b[0m ")
      }
      
      // Switch to the desired shell type
      websocket.send(JSON.stringify({
        type: "switch_shell",
        data: { shell_type: shellType }
      }))
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (message.type === "shell_response") {
        if (message.data?.success && message.data?.data?.output) {
          const output = message.data.data.output
          if (xtermRef.current) {
            // Write output line by line
            const lines = output.split("\n")
            lines.forEach((line: string) => {
              xtermRef.current!.writeln(line.replace(/\r/g, ""))
            })
            xtermRef.current.write("\x1b[1;34m$\x1b[0m ")
          }
        }
      }
    }

    websocket.onerror = (error) => {
      console.error("Shell WebSocket error:", error)
      if (xtermRef.current) {
        xtermRef.current.writeln("\r\n\x1b[31m✗ Connection error\x1b[0m")
      }
      setIsConnected(false)
    }

    websocket.onclose = () => {
      console.log("🔌 WebSocket disconnected")
      if (xtermRef.current) {
        xtermRef.current.writeln("\r\n\x1b[33m✗ Connection closed\x1b[0m")
      }
      setIsConnected(false)
    }

    return () => {
      websocket.close()
    }
  }, [shellType])

  const executeCommand = (command: string, term: XTerm) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      term.writeln("\x1b[31mError: Not connected to server\x1b[0m")
      term.write("\x1b[1;34m$\x1b[0m ")
      return
    }

    wsRef.current.send(JSON.stringify({
      type: "shell_command",
      device_id: deviceId,
      data: {
        command: command,
        shell_type: shellType
      }
    }))
  }

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear()
      xtermRef.current.write("\x1b[1;34m$\x1b[0m ")
    }
  }

  const handleShellChange = (type: "powershell" | "cmd") => {
    setShellType(type)
    if (xtermRef.current) {
      xtermRef.current.clear()
      xtermRef.current.writeln(`\x1b[1;33mSwitching to ${type === "powershell" ? "PowerShell" : "Command Prompt"}...\x1b[0m`)
      xtermRef.current.writeln("")
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Remote Shell (Xterm.js)
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400">
                <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Connected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={shellType} onValueChange={(v) => handleShellChange(v as "powershell" | "cmd")}>
          <div className="mb-4 flex items-center justify-between">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="powershell" className="data-[state=active]:bg-blue-600">
                <Power className="mr-2 h-4 w-4" />
                PowerShell
              </TabsTrigger>
              <TabsTrigger value="cmd" className="data-[state=active]:bg-green-600">
                <Terminal className="mr-2 h-4 w-4" />
                CMD
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              onClick={handleClear}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>

          <TabsContent value={shellType} className="mt-0">
            <div
              ref={terminalRef}
              className="rounded-lg border border-slate-800 bg-[#0a0e1a] p-4"
              style={{ height: "500px" }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
