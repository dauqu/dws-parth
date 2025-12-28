"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Search, Download, Trash2, RefreshCw, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { API_ENDPOINTS } from "@/lib/api-config"

interface SoftwareManagerProps {
  deviceId: string
  userId: string
}

interface Software {
  name: string
  version: string
  publisher: string
  id: string
}

export function SoftwareManager({ deviceId, userId }: SoftwareManagerProps) {
  const [installedSoftware, setInstalledSoftware] = useState<Software[]>([])
  const [searchResults, setSearchResults] = useState<Software[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [activeTab, setActiveTab] = useState("installed")
  const { toast } = useToast()

  useEffect(() => {
    const websocket = new WebSocket(API_ENDPOINTS.ws)

    websocket.onopen = () => {
      console.log("📦 Software manager WebSocket connected")
      setWs(websocket)
      loadInstalledSoftware(websocket)
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (message.type === "software_response") {
        console.log("📦 Software response:", message.data)
        if (message.data && message.data.success) {
          if (message.data.data) {
            if (activeTab === "installed") {
              setInstalledSoftware(message.data.data || [])
            } else {
              setSearchResults(message.data.data || [])
            }
          }
          if (message.data.message) {
            toast({
              title: "Success",
              description: message.data.message,
            })
          }
        } else {
          toast({
            title: "Error",
            description: message.data?.message || "Operation failed",
            variant: "destructive",
          })
        }
        setIsLoading(false)
        setIsSearching(false)
      }
    }

    websocket.onerror = (error) => {
      console.error("Software WebSocket error:", error)
      setIsLoading(false)
      setIsSearching(false)
    }

    return () => {
      websocket.close()
    }
  }, [])

  const loadInstalledSoftware = (websocket?: WebSocket) => {
    const socket = websocket || ws
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    setIsLoading(true)
    socket.send(JSON.stringify({
      type: "software_operation",
      device_id: deviceId,
      data: {
        action: "list"
      }
    }))
  }

  const handleSearch = () => {
    if (!searchQuery.trim() || !ws || ws.readyState !== WebSocket.OPEN) return

    setIsSearching(true)
    ws.send(JSON.stringify({
      type: "software_operation",
      device_id: deviceId,
      data: {
        action: "search",
        package_name: searchQuery
      }
    }))
  }

  const handleInstall = (packageID: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    toast({
      title: "Installing",
      description: `Installing ${packageID}...`,
    })

    ws.send(JSON.stringify({
      type: "software_operation",
      device_id: deviceId,
      data: {
        action: "install",
        package_id: packageID
      }
    }))

    setTimeout(() => loadInstalledSoftware(), 5000)
  }

  const handleUninstall = (packageID: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    toast({
      title: "Uninstalling",
      description: `Uninstalling ${packageID}...`,
    })

    ws.send(JSON.stringify({
      type: "software_operation",
      device_id: deviceId,
      data: {
        action: "uninstall",
        package_id: packageID
      }
    }))

    setTimeout(() => loadInstalledSoftware(), 3000)
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Software Manager (Winget)
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            onClick={() => loadInstalledSoftware()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="installed">Installed Software</TabsTrigger>
            <TabsTrigger value="search">Search & Install</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="mt-0">
            <div className="rounded-md border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-slate-800/50">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Version</TableHead>
                    <TableHead className="text-slate-400">Package ID</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading installed software...
                      </TableCell>
                    </TableRow>
                  ) : installedSoftware.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                        No software found
                      </TableCell>
                    </TableRow>
                  ) : (
                    installedSoftware.map((software, index) => (
                      <TableRow key={index} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-medium text-white">{software.name}</TableCell>
                        <TableCell className="text-slate-300">{software.version || "N/A"}</TableCell>
                        <TableCell className="text-slate-400 font-mono text-sm">{software.id}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                            onClick={() => handleUninstall(software.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Uninstall
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="search" className="mt-0 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Search for software (e.g., chrome, vscode, nodejs)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="rounded-md border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-slate-800/50">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Version</TableHead>
                    <TableHead className="text-slate-400">Package ID</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSearching ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Searching...
                      </TableCell>
                    </TableRow>
                  ) : searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                        {searchQuery ? "No results found" : "Enter a search query to find software"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults.map((software, index) => (
                      <TableRow key={index} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-medium text-white">{software.name}</TableCell>
                        <TableCell className="text-slate-300">{software.version || "Latest"}</TableCell>
                        <TableCell className="text-slate-400 font-mono text-sm">{software.id}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300 hover:bg-green-950/20"
                            onClick={() => handleInstall(software.id)}
                          >
                            <Download className="mr-1 h-4 w-4" />
                            Install
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
