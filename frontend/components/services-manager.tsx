"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Settings, Play, Square, Pause, PlayCircle, RefreshCw, Search, CheckCircle, XCircle, MoreVertical, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { API_ENDPOINTS } from "@/lib/api-config"

interface ServicesManagerProps {
  deviceId: string
  userId: string
}

interface Service {
  name: string
  display_name: string
  status: string
  startup_type: string
}

export function ServicesManager({ deviceId, userId }: ServicesManagerProps) {
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Connect to WebSocket
    const websocket = new WebSocket(API_ENDPOINTS.ws)
    
    websocket.onopen = () => {
      console.log("⚙️ Services manager WebSocket connected")
      setWs(websocket)
      loadServices(websocket)
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === "service_response") {
        console.log("⚙️ Services received:", message.data)
        // Server returns data nested as message.data.data (services array)
        if (message.data && message.data.success && message.data.data) {
          setServices(message.data.data || [])
        } else {
          setServices([])
          toast({
            title: "Error",
            description: message.data?.message || "Failed to load services",
            variant: "destructive",
          })
        }
        setIsLoading(false)
      } else if (message.type === "error") {
        toast({
          title: "Error",
          description: message.data?.message || "Failed to load services",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    websocket.onerror = (error) => {
      console.error("Services WebSocket error:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to service manager",
        variant: "destructive",
      })
      setIsLoading(false)
    }

    return () => {
      websocket.close()
    }
  }, [])

  useEffect(() => {
    let filtered = services

    // Sort services: running services on top
    filtered = [...filtered].sort((a, b) => {
      if (a.status === "Running" && b.status !== "Running") return -1
      if (a.status !== "Running" && b.status === "Running") return 1
      return a.display_name.localeCompare(b.display_name)
    })

    if (searchQuery) {
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((service) => service.status.toLowerCase() === statusFilter.toLowerCase())
    }

    setFilteredServices(filtered)
  }, [services, searchQuery, statusFilter])

  const loadServices = (websocket?: WebSocket) => {
    const socket = websocket || ws
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    setIsLoading(true)
    socket.send(JSON.stringify({
      type: "service_operation",
      device_id: deviceId,
      data: {
        action: "list"
      }
    }))
  }

  const handleServiceAction = (serviceName: string, action: "start" | "stop" | "pause" | "resume" | "restart" | "enable" | "disable") => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify({
      type: "service_operation",
      device_id: deviceId,
      data: {
        action: action,
        service_name: serviceName
      }
    }))

    toast({
      title: "Action Requested",
      description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${serviceName}`,
    })

    setTimeout(() => loadServices(), 2000)
  }

  const handleRefresh = () => {
    loadServices()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Compact Toolbar */}
      <div className="flex items-center h-10 px-3 shrink-0 bg-[#111] rounded-t-lg border-b border-slate-800">
        {/* Left - Title */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Settings className="h-3.5 w-3.5 text-orange-400" />
          <span className="text-white font-medium">Services</span>
          <span className="text-slate-500 ml-1">{services.length}</span>
        </div>
        
        <div className="flex-1" />
        
        {/* Filter & Actions */}
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-24 h-7 text-[10px] border-slate-700 bg-slate-800/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800">
              <SelectItem value="all" className="text-white text-xs">All</SelectItem>
              <SelectItem value="running" className="text-white text-xs">Running</SelectItem>
              <SelectItem value="stopped" className="text-white text-xs">Stopped</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 bg-[#0a0a0a] border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs border-slate-700 bg-slate-800/50 pl-8 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Services Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-[#0a0a0a] rounded-b-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-[#0a0a0a] z-10">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs">Name</TableHead>
              <TableHead className="text-slate-400 text-xs">Display Name</TableHead>
              <TableHead className="text-slate-400 text-xs">Status</TableHead>
              <TableHead className="text-slate-400 text-xs text-right w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                    Loading services...
                  </TableCell>
                </TableRow>
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                    No services found
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service, index) => (
                  <ContextMenu key={index}>
                    <ContextMenuTrigger asChild>
                      <TableRow className="border-slate-800 hover:bg-slate-800/50 cursor-context-menu">
                        <TableCell className="font-medium text-white font-mono text-sm">
                          {service.name}
                        </TableCell>
                        <TableCell className="text-slate-300">{service.display_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              service.status === "Running"
                                ? "border-green-500/30 bg-green-500/10 text-green-400"
                                : service.status === "Paused"
                                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                                : "border-red-500/30 bg-red-500/10 text-red-400",
                            )}
                          >
                            {service.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-white hover:bg-slate-800"
                                disabled={isLoading}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                              <DropdownMenuItem
                                onClick={() => handleServiceAction(service.name, "start")}
                                disabled={service.status === "Running" || service.status === "Paused" || isLoading}
                                className="text-green-400 hover:text-green-300 hover:bg-green-950/20 cursor-pointer"
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Start
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleServiceAction(service.name, "stop")}
                                disabled={service.status === "Stopped" || isLoading}
                                className="text-red-400 hover:text-red-300 hover:bg-red-950/20 cursor-pointer"
                              >
                                <Square className="mr-2 h-4 w-4" />
                                Stop
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleServiceAction(service.name, "pause")}
                                disabled={service.status !== "Running" || isLoading}
                                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/20 cursor-pointer"
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Pause
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleServiceAction(service.name, "resume")}
                                disabled={service.status !== "Paused" || isLoading}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 cursor-pointer"
                              >
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Resume
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleServiceAction(service.name, "restart")}
                                disabled={service.status === "Stopped" || isLoading}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/20 cursor-pointer"
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Restart
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-800" />
                              <DropdownMenuItem
                                onClick={() => loadServices()}
                                disabled={isLoading}
                                className="text-slate-400 hover:text-slate-300 hover:bg-slate-800 cursor-pointer"
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Refresh
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-800" />
                              <DropdownMenuItem
                                onClick={() => handleServiceAction(service.name, "enable")}
                                disabled={service.startup_type === "Automatic" || isLoading}
                                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/20 cursor-pointer"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Enable (Auto)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleServiceAction(service.name, "disable")}
                                disabled={service.startup_type === "Disabled" || isLoading}
                                className="text-orange-400 hover:text-orange-300 hover:bg-orange-950/20 cursor-pointer"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Disable
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-slate-900 border-slate-800">
                      <ContextMenuItem
                        onClick={() => handleServiceAction(service.name, "start")}
                        disabled={service.status === "Running" || service.status === "Paused" || isLoading}
                        className="text-green-400 hover:text-green-300 hover:bg-green-950/20 cursor-pointer"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Start Service
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleServiceAction(service.name, "stop")}
                        disabled={service.status === "Stopped" || isLoading}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/20 cursor-pointer"
                      >
                        <Square className="mr-2 h-4 w-4" />
                        Stop Service
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleServiceAction(service.name, "pause")}
                        disabled={service.status !== "Running" || isLoading}
                        className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/20 cursor-pointer"
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        Pause Service
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleServiceAction(service.name, "resume")}
                        disabled={service.status !== "Paused" || isLoading}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 cursor-pointer"
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Resume Service
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleServiceAction(service.name, "restart")}
                        disabled={service.status === "Stopped" || isLoading}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/20 cursor-pointer"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Restart Service
                      </ContextMenuItem>
                      <ContextMenuSeparator className="bg-slate-800" />
                      <ContextMenuItem
                        onClick={() => loadServices()}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-slate-300 hover:bg-slate-800 cursor-pointer"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Refresh List
                      </ContextMenuItem>
                      <ContextMenuSeparator className="bg-slate-800" />
                      <ContextMenuItem
                        onClick={() => handleServiceAction(service.name, "enable")}
                        disabled={service.startup_type === "Automatic" || isLoading}
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/20 cursor-pointer"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Enable (Auto Start)
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleServiceAction(service.name, "disable")}
                        disabled={service.startup_type === "Disabled" || isLoading}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-950/20 cursor-pointer"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Disable Service
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  )
}
