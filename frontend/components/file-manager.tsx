"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  File,
  Folder,
  Download,
  Upload,
  MoreVertical,
  Search,
  Copy,
  Trash2,
  FolderOpen,
  RefreshCw,
  FolderPlus,
  Edit,
  Eye,
  Scissors,
  ClipboardPaste,
  FileEdit,
  FilePlus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { wsService } from "@/lib/websocket-service"

interface FileManagerProps {
  deviceId: string
  userId: string
}

interface FileItem {
  mod_time: unknown
  name: string
  path: string
  size: number
  is_dir: boolean
  modified: string
}

export function FileManager({ deviceId, userId }: FileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState("C:\\")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [clipboard, setClipboard] = useState<{ path: string; name: string; action: 'copy' | 'cut' } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editingFile, setEditingFile] = useState<{ path: string; name: string; content: string } | null>(null)
  const [fileContent, setFileContent] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      } else if (message.type === "file_download_response") {
        console.log("📥 Download response received")
        if (message.data && message.data.success && message.data.content) {
          // Create download from base64 content
          const byteCharacters = atob(message.data.content)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray])
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = message.data.filename || 'download'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast({
            title: "Download Complete",
            description: `Downloaded ${message.data.filename}`,
          })
        } else {
          toast({
            title: "Download Failed",
            description: message.data?.message || "Failed to download file",
            variant: "destructive",
          })
        }
      } else if (message.type === "file_upload_response") {
        console.log("📤 Upload response received")
        setIsUploading(false)
        if (message.data && message.data.success) {
          toast({
            title: "Upload Complete",
            description: "File uploaded successfully",
          })
          loadFiles(currentPath)
        } else {
          toast({
            title: "Upload Failed",
            description: message.data?.message || "Failed to upload file",
            variant: "destructive",
          })
        }
      } else if (message.type === "file_read_response") {
        console.log("📖 File read response received")
        if (message.data && message.data.success) {
          setFileContent(message.data.data || "")
        } else {
          toast({
            title: "Read Failed",
            description: message.data?.message || "Failed to read file",
            variant: "destructive",
          })
          setEditDialogOpen(false)
          setViewDialogOpen(false)
        }
      } else if (message.type === "file_write_response") {
        console.log("💾 File write response received")
        if (message.data && message.data.success) {
          toast({
            title: "File Saved",
            description: "File saved successfully",
          })
          setEditDialogOpen(false)
          setEditingFile(null)
        } else {
          toast({
            title: "Save Failed",
            description: message.data?.message || "Failed to save file",
            variant: "destructive",
          })
        }
      } else if (message.type === "error" && message.data?.message) {
        toast({
          title: "Error",
          description: message.data.message,
          variant: "destructive",
        })
        setIsLoading(false)
        setIsUploading(false)
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
    handleOpenFolder('C:\\')
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

  const handleDownloadFile = (filePath: string, fileName: string) => {
    if (!wsService.isConnected()) return

    toast({
      title: "Downloading",
      description: `Preparing download for ${fileName}...`,
    })

    wsService.send({
      type: "file_download",
      device_id: deviceId,
      data: {
        path: filePath,
        filename: fileName
      }
    })
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !wsService.isConnected()) return

    setIsUploading(true)
    toast({
      title: "Uploading",
      description: `Uploading ${file.name}...`,
    })

    try {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        wsService.send({
          type: "file_upload",
          device_id: deviceId,
          data: {
            path: currentPath,
            filename: file.name,
            content: base64
          }
        })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setIsUploading(false)
      toast({
        title: "Upload Error",
        description: "Failed to read file",
        variant: "destructive",
      })
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCreateFolder = () => {
    const folderName = prompt("Enter folder name:")
    if (!folderName || !wsService.isConnected()) return

    const newPath = `${currentPath}\\${folderName}`
    wsService.send({
      type: "file_operation",
      device_id: deviceId,
      data: {
        action: "mkdir",
        path: newPath
      }
    })

    toast({
      title: "Creating Folder",
      description: `Creating ${folderName}...`,
    })

    setTimeout(() => loadFiles(currentPath), 1000)
  }

  const handleRenameFile = (filePath: string, oldName: string) => {
    const newName = prompt("Enter new name:", oldName)
    if (!newName || newName === oldName || !wsService.isConnected()) return

    const pathParts = filePath.split('\\')
    pathParts.pop()
    const newPath = `${pathParts.join('\\')}\\${newName}`

    wsService.send({
      type: "file_operation",
      device_id: deviceId,
      data: {
        action: "move",
        path: filePath,
        new_path: newPath
      }
    })

    toast({
      title: "Renaming",
      description: `Renaming to ${newName}...`,
    })

    setTimeout(() => loadFiles(currentPath), 1000)
  }

  const handleCopyFile = (filePath: string, fileName: string) => {
    setClipboard({ path: filePath, name: fileName, action: 'copy' })
    toast({
      title: "Copied",
      description: `${fileName} copied to clipboard`,
    })
  }

  const handleCutFile = (filePath: string, fileName: string) => {
    setClipboard({ path: filePath, name: fileName, action: 'cut' })
    toast({
      title: "Cut",
      description: `${fileName} ready to move`,
    })
  }

  const handlePaste = () => {
    if (!clipboard || !wsService.isConnected()) return

    const newPath = `${currentPath}\\${clipboard.name}`
    const action = clipboard.action === 'copy' ? 'copy' : 'move'

    wsService.send({
      type: "file_operation",
      device_id: deviceId,
      data: {
        action: action,
        path: clipboard.path,
        new_path: newPath
      }
    })

    toast({
      title: clipboard.action === 'copy' ? "Copying" : "Moving",
      description: `${clipboard.action === 'copy' ? 'Copying' : 'Moving'} ${clipboard.name}...`,
    })

    if (clipboard.action === 'cut') {
      setClipboard(null)
    }

    setTimeout(() => loadFiles(currentPath), 1000)
  }

  const handleViewFile = (filePath: string, fileName: string) => {
    if (!wsService.isConnected()) return

    setEditingFile({ path: filePath, name: fileName, content: '' })
    setFileContent('')
    setViewDialogOpen(true)

    wsService.send({
      type: "file_read",
      device_id: deviceId,
      data: {
        action: "read",
        path: filePath
      }
    })
  }

  const handleEditFile = (filePath: string, fileName: string) => {
    if (!wsService.isConnected()) return

    setEditingFile({ path: filePath, name: fileName, content: '' })
    setFileContent('')
    setEditDialogOpen(true)

    wsService.send({
      type: "file_read",
      device_id: deviceId,
      data: {
        action: "read",
        path: filePath
      }
    })
  }

  const handleSaveFile = () => {
    if (!editingFile || !wsService.isConnected()) return

    wsService.send({
      type: "file_write",
      device_id: deviceId,
      data: {
        action: "create",
        path: editingFile.path,
        content: fileContent
      }
    })
  }

  const handleCreateFile = () => {
    const fileName = prompt("Enter file name:")
    if (!fileName || !wsService.isConnected()) return

    const newPath = `${currentPath}\\${fileName}`
    wsService.send({
      type: "file_operation",
      device_id: deviceId,
      data: {
        action: "create",
        path: newPath,
        content: ""
      }
    })

    toast({
      title: "Creating File",
      description: `Creating ${fileName}...`,
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
    <div className="flex flex-col h-full">
      {/* Compact Toolbar */}
      <div className="flex items-center h-10 px-3 shrink-0 bg-[#111] rounded-t-lg border-b border-slate-800">
        {/* Left - Title & Path */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <FolderOpen className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-white font-medium">Files</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500">
            <span>|</span>
            <span className="font-mono truncate max-w-[200px]">{currentPath}</span>
          </div>
        </div>
        
        <div className="flex-1" />
        
        {/* Navigation */}
        <div className="flex items-center gap-0.5 mr-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={handleGoUp}
            disabled={currentPath === "C:\\" || currentPath === "C:/"}
            title="Go up"
          >
            <span className="text-xs">↑</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={handleGoHome}
            title="Home"
          >
            <span className="text-xs">🏠</span>
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={handleUploadClick}
            disabled={isUploading}
            title="Upload"
          >
            <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-pulse' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={handleCreateFile}
            title="New File"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
            onClick={handleCreateFolder}
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </Button>
          {clipboard && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-white/10"
              onClick={handlePaste}
              title="Paste"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
            </Button>
          )}
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
            placeholder="Search files..."
            className="h-8 text-xs border-slate-700 bg-slate-800/50 pl-8 text-white placeholder:text-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* File Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-[#0a0a0a] rounded-b-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-[#0a0a0a] z-10">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs">Name</TableHead>
              <TableHead className="text-slate-400 text-xs">Size</TableHead>
              <TableHead className="text-slate-400 text-xs">Modified</TableHead>
              <TableHead className="text-slate-400 text-xs text-right w-16">Actions</TableHead>
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
                  <ContextMenu key={index}>
                    <ContextMenuTrigger asChild>
                      <TableRow className="border-slate-800 hover:bg-slate-800/30 cursor-context-menu">
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
                                <>
                                  <DropdownMenuItem 
                                    className="text-slate-200 hover:bg-slate-700"
                                    onClick={() => handleDownloadFile(file.path, file.name)}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-slate-200 hover:bg-slate-700"
                                    onClick={() => handleViewFile(file.path, file.name)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-slate-200 hover:bg-slate-700"
                                    onClick={() => handleEditFile(file.path, file.name)}
                                  >
                                    <FileEdit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator className="bg-slate-700" />
                              <DropdownMenuItem 
                                className="text-slate-200 hover:bg-slate-700"
                                onClick={() => handleRenameFile(file.path, file.name)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-slate-200 hover:bg-slate-700"
                                onClick={() => handleCopyFile(file.path, file.name)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-slate-200 hover:bg-slate-700"
                                onClick={() => handleCutFile(file.path, file.name)}
                              >
                                <Scissors className="mr-2 h-4 w-4" />
                                Cut
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
                    </ContextMenuTrigger>
                    <ContextMenuContent className="border-slate-700 bg-slate-800">
                      {file.is_dir ? (
                        <ContextMenuItem 
                          className="text-slate-200 hover:bg-slate-700" 
                          onClick={() => handleOpenFolder(file.path)}
                        >
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Open Folder
                        </ContextMenuItem>
                      ) : (
                        <>
                          <ContextMenuItem 
                            className="text-slate-200 hover:bg-slate-700"
                            onClick={() => handleDownloadFile(file.path, file.name)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </ContextMenuItem>
                          <ContextMenuItem 
                            className="text-slate-200 hover:bg-slate-700"
                            onClick={() => handleViewFile(file.path, file.name)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </ContextMenuItem>
                          <ContextMenuItem 
                            className="text-slate-200 hover:bg-slate-700"
                            onClick={() => handleEditFile(file.path, file.name)}
                          >
                            <FileEdit className="mr-2 h-4 w-4" />
                            Edit
                          </ContextMenuItem>
                        </>
                      )}
                      <ContextMenuSeparator className="bg-slate-700" />
                      <ContextMenuItem 
                        className="text-slate-200 hover:bg-slate-700"
                        onClick={() => handleRenameFile(file.path, file.name)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Rename
                      </ContextMenuItem>
                      <ContextMenuItem 
                        className="text-slate-200 hover:bg-slate-700"
                        onClick={() => handleCopyFile(file.path, file.name)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </ContextMenuItem>
                      <ContextMenuItem 
                        className="text-slate-200 hover:bg-slate-700"
                        onClick={() => handleCutFile(file.path, file.name)}
                      >
                        <Scissors className="mr-2 h-4 w-4" />
                        Cut
                      </ContextMenuItem>
                      {clipboard && (
                        <ContextMenuItem 
                          className="text-green-400 hover:bg-slate-700"
                          onClick={handlePaste}
                        >
                          <ClipboardPaste className="mr-2 h-4 w-4" />
                          Paste Here
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator className="bg-slate-700" />
                      <ContextMenuItem 
                        className="text-red-400 hover:bg-slate-700"
                        onClick={() => handleDeleteFile(file.path)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      {/* View File Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] border-slate-700 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5" />
              View: {editingFile?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingFile?.path}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[50vh]">
            <pre className="p-4 bg-slate-950 rounded-lg text-sm text-slate-300 font-mono whitespace-pre-wrap">
              {fileContent || "Loading..."}
            </pre>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              onClick={() => setViewDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setViewDialogOpen(false)
                if (editingFile) {
                  handleEditFile(editingFile.path, editingFile.name)
                }
              }}
            >
              <FileEdit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit File Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] border-slate-700 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileEdit className="h-5 w-5" />
              Edit: {editingFile?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingFile?.path}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="min-h-[300px] border-slate-700 bg-slate-950 text-white font-mono text-sm"
            placeholder="Loading file content..."
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              onClick={() => {
                setEditDialogOpen(false)
                setEditingFile(null)
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSaveFile}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
