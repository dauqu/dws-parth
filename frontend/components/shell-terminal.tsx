"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Terminal, Trash2, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { API_ENDPOINTS } from "@/lib/api-config"

interface ShellTerminalProps {
  deviceId: string
  userId: string
}

interface ShellSession {
  id: string
  command: string
  output: string
  executed_at: string
}

export function ShellTerminal({ deviceId, userId }: ShellTerminalProps) {
  const [shellType, setShellType] = useState<"powershell" | "cmd">("powershell")
  const [command, setCommand] = useState("")
  const [history, setHistory] = useState<ShellSession[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Connect to WebSocket
    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      console.log("💻 Shell terminal WebSocket connected")
      setWs(websocket)
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === "shell_response") {
        console.log("💻 Shell output received:", message.data)
        // Server returns response with success flag and data
        if (message.data && message.data.success && message.data.data) {
          const newSession: ShellSession = {
            id: Date.now().toString(),
            command: command,
            output: message.data.data.output || "",
            executed_at: new Date().toISOString(),
          }
          setHistory((prev) => [...prev, newSession])
        } else {
          const newSession: ShellSession = {
            id: Date.now().toString(),
            command: command,
            output: message.data?.message || "Command execution failed",
            executed_at: new Date().toISOString(),
          }
          setHistory((prev) => [...prev, newSession])
        }
        setIsExecuting(false)
      } else if (message.type === "error") {
        // Only show error if there's a message
        if (message.data?.message) {
          toast({
            title: "Error",
            description: message.data.message,
            variant: "destructive",
          })
        }
        setIsExecuting(false)
      }
    }

    websocket.onerror = (error) => {
      console.error("Shell WebSocket error:", error)
      // Only show error on initial connection failure
      if (history.length === 0) {
        toast({
          title: "Connection Error",
          description: "Failed to connect to shell service",
          variant: "destructive",
        })
      }
    }

    return () => {
      websocket.close()
    }
  }, [])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  const executeCommand = async () => {
    if (!command.trim() || !ws || ws.readyState !== WebSocket.OPEN) return

    setIsExecuting(true)

    // Send command via WebSocket
    ws.send(JSON.stringify({
      type: "shell_command",
      data: {
        session_id: deviceId,
        command: command,
        shell_type: shellType
      }
    }))

    setCommand("")
  }

  const handleShellSwitch = (newShellType: "powershell" | "cmd") => {
    if (newShellType === shellType) return
    
    setShellType(newShellType)
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "switch_shell",
        data: {
          session_id: deviceId,
          shell_type: newShellType
        }
      }))
    }
    
    toast({
      title: "Shell Switched",
      description: `Now using ${newShellType.toUpperCase()}`
    })
  }

  const simulateCommandOutput = (cmd: string, shell: "powershell" | "cmd"): string => {
    const cmdLower = cmd.toLowerCase().trim()

    if (cmdLower === "dir" || cmdLower === "ls" || cmdLower.startsWith("get-childitem")) {
      return `Directory: C:\\Users\\Admin

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        12/26/2024   3:14 PM                Documents
d-----        12/26/2024   2:45 PM                Downloads
d-----        12/20/2024   8:32 AM                Pictures
-a----        12/25/2024   4:21 PM          15248 report.txt
-a----        12/24/2024   1:15 PM        2048576 data.db`
    }

    if (cmdLower.startsWith("get-service") || cmdLower === "services") {
      return `Status   Name               DisplayName
------   ----               -----------
Running  BITS               Background Intelligent Transfer Ser...
Running  Dhcp               DHCP Client
Stopped  WSearch            Windows Search
Running  Winmgmt            Windows Management Instrumentation`
    }

    if (cmdLower.startsWith("get-process") || cmdLower === "tasklist") {
      return `Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName
-------  ------    -----      -----     ------     --  -- -----------
    845      45    25484      38256       2.14   4532   1 chrome
    234      18     8924      15632       0.52   2348   1 explorer
    512      32    18764      24896       1.28   3764   1 code`
    }

    if (cmdLower.startsWith("systeminfo") || cmdLower.startsWith("get-computerinfo")) {
      return `Host Name:                 DESKTOP-PC01
OS Name:                   Microsoft Windows 11 Pro
OS Version:                10.0.22621 N/A Build 22621
System Manufacturer:       Dell Inc.
System Model:              OptiPlex 7090
Processor:                 Intel(R) Core(TM) i7-11700 @ 2.50GHz
Total Physical Memory:     32,768 MB`
    }

    if (cmdLower === "ipconfig" || cmdLower.startsWith("get-netipaddress")) {
      return `Windows IP Configuration

Ethernet adapter Ethernet:
   Connection-specific DNS Suffix  . : 
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1`
    }

    if (cmdLower === "hostname") {
      return "DESKTOP-PC01"
    }

    if (cmdLower === "whoami") {
      return "desktop-pc01\\administrator"
    }

    if (cmdLower === "help" || cmdLower === "get-command") {
      return shell === "powershell"
        ? `Common PowerShell commands:
Get-ChildItem    - List directory contents
Get-Service      - List Windows services
Get-Process      - List running processes
Get-ComputerInfo - Display system information
Get-NetIPAddress - Display network configuration`
        : `Common CMD commands:
dir              - List directory contents
tasklist         - List running processes
systeminfo       - Display system information
ipconfig         - Display network configuration
hostname         - Display computer name`
    }

    return shell === "powershell"
      ? `CommandNotFoundException: The term '${cmd}' is not recognized as the name of a cmdlet, function, script file, or operable program.`
      : `'${cmd}' is not recognized as an internal or external command, operable program or batch file.`
  }

  const clearHistory = () => {
    setHistory([])
    toast({
      title: "Success",
      description: "Terminal history cleared",
    })
  }

  const exportHistory = () => {
    const historyText = history
      .map((session) => {
        return `[${new Date(session.executed_at).toLocaleString()}] ${shellType.toUpperCase()}> ${session.command}\n${session.output}\n\n`
      })
      .join("")

    const blob = new Blob([historyText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `shell-history-${shellType}-${new Date().toISOString()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isExecuting) {
      executeCommand()
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Remote Shell
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              onClick={exportHistory}
              disabled={history.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-700 bg-red-950/20 text-red-400 hover:bg-red-950/40"
              onClick={clearHistory}
              disabled={history.length === 0}
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
              <Terminal className="mr-2 h-4 w-4" />
              PowerShell
            </TabsTrigger>
            <TabsTrigger
              value="cmd"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              <Terminal className="mr-2 h-4 w-4" />
              CMD
            </TabsTrigger>
          </TabsList>

          <TabsContent value={shellType} className="space-y-4">
            <div
              ref={terminalRef}
              className="font-mono text-sm bg-slate-950 border border-slate-800 rounded-lg p-4 h-96 overflow-y-auto"
            >
              {history.length === 0 ? (
                <div className="text-slate-500">
                  <p className="mb-2">{shellType === "powershell" ? "Windows PowerShell" : "Microsoft Windows CMD"}</p>
                  <p className="mb-4">Copyright (c) Microsoft Corporation. All rights reserved.</p>
                  <p className="mb-2">Type 'help' to see available commands.</p>
                  <div className="flex items-center gap-2 text-green-400">
                    <span>PS C:\Users\Admin&gt;</span>
                    <span className="animate-pulse">_</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((session) => (
                    <div key={session.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-slate-700 bg-slate-800 text-slate-400 font-mono text-xs"
                        >
                          {new Date(session.executed_at).toLocaleTimeString()}
                        </Badge>
                        <span className="text-green-400 font-semibold">
                          {shellType === "powershell" ? "PS" : "C:\\Users\\Admin"}&gt;
                        </span>
                        <span className="text-blue-400">{session.command}</span>
                      </div>
                      <pre className="text-slate-300 whitespace-pre-wrap pl-4 text-xs leading-relaxed">
                        {session.output}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-3">
                <span className="font-mono text-sm text-green-400 font-semibold">
                  {shellType === "powershell" ? "PS" : "C:\\Users\\Admin"}&gt;
                </span>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter command..."
                  disabled={isExecuting}
                  className="border-0 bg-transparent text-blue-400 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-600"
                />
              </div>
              <Button
                onClick={executeCommand}
                disabled={!command.trim() || isExecuting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isExecuting ? "Executing..." : "Execute"}
              </Button>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p>
                Try commands like: <code className="text-blue-400">dir</code>,{" "}
                <code className="text-blue-400">systeminfo</code>, <code className="text-blue-400">ipconfig</code>,{" "}
                {shellType === "powershell" ? (
                  <>
                    <code className="text-blue-400">Get-Service</code>,{" "}
                    <code className="text-blue-400">Get-Process</code>
                  </>
                ) : (
                  <>
                    <code className="text-blue-400">tasklist</code>, <code className="text-blue-400">hostname</code>
                  </>
                )}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
