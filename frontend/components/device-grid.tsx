"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Monitor,
  User,
  WifiOff,
  Wifi,
  AlertTriangle,
  Activity,
  MoreVertical,
  Trash2,
  Archive,
  Edit,
  Power,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { Device } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface DeviceGridProps {
  devices: Device[]
  onDelete?: (id: string) => void
  onArchive?: (id: string) => void
}

export function DeviceGrid({ devices, onDelete, onArchive }: DeviceGridProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = (e: React.MouseEvent, deviceId: string, deviceName: string) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete ${deviceName}?`)) {
      onDelete?.(deviceId)
      toast({
        title: "Device Deleted",
        description: `${deviceName} has been removed from your dashboard.`,
      })
    }
  }

  const handleArchive = (e: React.MouseEvent, deviceId: string, deviceName: string) => {
    e.stopPropagation()
    onArchive?.(deviceId)
    toast({
      title: "Device Archived",
      description: `${deviceName} has been archived.`,
    })
  }

  const handleShutdown = (e: React.MouseEvent, deviceName: string) => {
    e.stopPropagation()
    toast({
      title: "Shutdown Command Sent",
      description: `Sending shutdown command to ${deviceName}...`,
    })
  }

  const handleRestart = (e: React.MouseEvent, deviceName: string) => {
    e.stopPropagation()
    toast({
      title: "Restart Command Sent",
      description: `Sending restart command to ${deviceName}...`,
    })
  }

  if (devices.length === 0) {
    return (
      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Monitor className="mb-4 h-16 w-16 text-slate-600" />
          <h3 className="mb-2 text-xl font-semibold text-slate-300">No Devices Found</h3>
          <p className="text-sm text-slate-500">Add your first Windows device to get started</p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700">Add Device</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {devices.map((device) => (
        <Card
          key={device.id}
          className="group cursor-pointer overflow-hidden border-slate-800 bg-slate-900/50 transition-all hover:border-blue-500/50 hover:bg-slate-900"
          onClick={() => router.push(`/dashboard/device/${device.id}`)}
        >
          <div className="relative h-48 w-full overflow-hidden bg-slate-800">
            <img
              src={device.wallpaper_url || "/placeholder.svg"}
              alt={`${device.name} wallpaper`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

            <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "border font-medium backdrop-blur-sm",
                  device.status === "online"
                    ? "border-green-500/30 bg-green-500/20 text-green-400"
                    : device.status === "maintenance"
                      ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                      : "border-slate-600/30 bg-slate-600/20 text-slate-400",
                )}
              >
                {device.status === "online" ? (
                  <Activity className="mr-1 h-3 w-3" />
                ) : device.status === "maintenance" ? (
                  <AlertTriangle className="mr-1 h-3 w-3" />
                ) : (
                  <WifiOff className="mr-1 h-3 w-3" />
                )}
                {device.status}
              </Badge>
              {device.connection_status === "connected" ? (
                <div className="rounded-full bg-green-500/20 p-1.5 backdrop-blur-sm">
                  <Wifi className="h-4 w-4 text-green-400" />
                </div>
              ) : (
                <div className="rounded-full bg-slate-600/20 p-1.5 backdrop-blur-sm">
                  <WifiOff className="h-4 w-4 text-slate-400" />
                </div>
              )}
            </div>

            <div className="absolute left-4 top-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-slate-900/50 backdrop-blur-sm text-white hover:bg-slate-900/80"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 border-slate-800 bg-slate-900">
                  <DropdownMenuItem
                    className="text-slate-300 focus:bg-slate-800 focus:text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/device/${device.id}`)
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Manage Device
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-slate-300 focus:bg-slate-800 focus:text-white"
                    onClick={(e) => handleRestart(e, device.name)}
                  >
                    <Power className="mr-2 h-4 w-4" />
                    Restart
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-slate-300 focus:bg-slate-800 focus:text-white"
                    onClick={(e) => handleShutdown(e, device.name)}
                  >
                    <Power className="mr-2 h-4 w-4" />
                    Shutdown
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem
                    className="text-yellow-400 focus:bg-yellow-950/20 focus:text-yellow-400"
                    onClick={(e) => handleArchive(e, device.id, device.name)}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-400 focus:bg-red-950/20 focus:text-red-400"
                    onClick={(e) => handleDelete(e, device.id, device.name)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600/10 ring-1 ring-blue-500/20 group-hover:bg-blue-600/20">
                <Monitor className="h-6 w-6 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 truncate text-lg font-semibold text-white">{device.name}</h3>
                <p className="truncate text-sm text-slate-400">{device.hostname}</p>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-800/50 p-3">
              <User className="h-4 w-4 text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">Windows User</p>
                <p className="truncate text-sm font-medium text-slate-200">{device.windows_username}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">IP Address</span>
                <span className="font-medium text-slate-300">{device.ip_address}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Last seen</span>
                <span className="font-medium text-slate-300">{new Date(device.last_seen).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
