"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  File,
  Folder,
  Download,
  MoreVertical,
  Search,
  Copy,
  Trash2,
  FolderOpen,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { wsService } from "@/lib/websocket-service"

interface FileManagerProps {
  deviceId: string
  userId: string
}

interface FileItem {
  name: string
  path: string
  size: number
  is_dir: boolean
  modified: string
}

export function FileManager({ deviceId, userId }: FileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState("C:\\Users")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    console.log('📁 FileManager mounted for device:', deviceId)
    
    const handleMessage = (message: any) => {
      // Only process messages for this device
      if (message.device_id && message.device_id !== deviceId) {
        return
      }
      
      if (message.type === "file_response") {
        console.log("📁 Files received:", message.data)
        if (message.data && message.data.success && message.data.data) {
          setFiles(message.data.data || [])
        } else {
          setFiles([])
          if (message.data?.message) {
            toast({
              title: "Error",
              description: message.data.message,
              variant: "destructive",
            })
          }
        }
        setIsLoading(false)
      } else if (message.type === "error" && message.data?.message) {
        toast({
          title: "Error",
          description: message.data.message,
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    // Subscribe to WebSocket messages
    const cleanup = wsService.addMessageHandler(handleMessage)
    
    // Load initial files
    loadFiles(currentPath)

    return () => {
      console.log('📁 FileManager unmounted')
      cleanup()
    }
  }, [deviceId])

  const loadFiles = (path: string) => {
    if (!wsService.isConnected()) {
      console.warn('WebSocket not connected, cannot load files')
      return
    }

    setIsLoading(true)
    wsService.send({
      type: "file_operation",
      device_id: deviceId,
      data: {
        action: "list",
        path: path
      }
    })
  }

  const handleOpenFolder = (folderPath: string) => {
    setCurrentPath(folderPath)
    loadFiles(folderPath)
  }

  const handleRefresh = () => {
    loadFiles(currentPath)
  }

  const handleGoUp = () => {
    const parts = currentPath.split('\\')
    if (parts.length > 1) {
      parts.pop()
      const parentPath = parts.join('\\') || 'C:\\'
      handleOpenFolder(parentPath)
    }
  }

  const handleGoHome = () => {
    handleOpenFolder('C:\\Users')
  }

  const handleDeleteFile = (filePath: string) => {
    if (!wsService.isConnected()) return

    wsService.send({
      type: "file_operation",
      device_id: deviceId,
      data: {
        action: "delete",
        path: filePath
      }
    })

    toast({
      title: "Deleting",
      description: "File deletion requested",
    })

    setTimeout(() => loadFiles(currentPath), 1000)
  }

  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.path.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "-"
    if (!bytes) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return "-"
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            File Manager
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            onClick={handleGoUp}
            disabled={currentPath === "C:\\" || currentPath === "C:/"}
          >
            ⬆️ Up
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            onClick={handleGoHome}
          >
            🏠 Home
          </Button>
          <div className="text-sm text-slate-400 flex-1">
            <span className="text-slate-500">Path:</span> <span className="text-white font-mono">{currentPath}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search files and folders..."
              className="border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">Size</TableHead>
                <TableHead className="text-slate-400">Modified</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                    Loading files...
                  </TableCell>
                </TableRow>
              ) : filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                    No files found
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file, index) => (
                  <TableRow key={index} className="border-slate-800 hover:bg-slate-800/30">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        {file.is_dir ? (
                          <Folder className="h-4 w-4 text-blue-400" />
                        ) : (
                          <File className="h-4 w-4 text-slate-400" />
                        )}
                        <button
                          onClick={() => file.is_dir && handleOpenFolder(file.path)}
                          className={file.is_dir ? "hover:text-blue-400 cursor-pointer" : ""}
                        >
                          {file.name}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">{file.is_dir ? "<folder>" : formatFileSize(file.size)}</TableCell>
                    <TableCell className="text-slate-400">{formatDate(file.mod_time as unknown as string)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-slate-700 bg-slate-800">
                          {file.is_dir ? (
                            <DropdownMenuItem 
                              className="text-slate-200 hover:bg-slate-700" 
                              onClick={() => handleOpenFolder(file.path)}
                            >
                              <FolderOpen className="mr-2 h-4 w-4" />
                              Open
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-slate-200 hover:bg-slate-700">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-slate-200 hover:bg-slate-700">
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem 
                            className="text-red-400 hover:bg-slate-700"
                            onClick={() => handleDeleteFile(file.path)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
