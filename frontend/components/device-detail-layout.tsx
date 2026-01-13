"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Monitor,
  Activity,
  HardDrive,
  Cpu,
  Wifi,
  FolderTree,
  Terminal,
  Settings,
  Eye,
  MemoryStick,
  Clock,
  User,
  MapPin,
  Calendar,
  Server,
  ListTodo,
  ArrowLeft,
  Power,
  RefreshCw,
  Circle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { Device } from "@/lib/types"
import { cn } from "@/lib/utils"
import { FileManager } from "@/components/file-manager"
import { ScreenViewer } from "@/components/screen-viewer"
import { ProfessionalTerminal } from "@/components/professional-terminal"
import { ServicesManager } from "@/components/services-manager"
import { TaskManager } from "@/components/task-manager"
import { useSystemMetrics } from "@/lib/hooks/useWebSocket"

interface DeviceDetailLayoutProps {
  device: Device
  userId: string
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

const navItems = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "screen", label: "Screen", icon: Eye },
  { id: "shell", label: "Terminal", icon: Terminal },
  { id: "files", label: "Files", icon: FolderTree },
  { id: "tasks", label: "Processes", icon: ListTodo },
  { id: "services", label: "Services", icon: Settings },
]

export function DeviceDetailLayout({ device, userId }: DeviceDetailLayoutProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const { systemInfo, isConnected } = useSystemMetrics(device.id)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f0f0f]/95 backdrop-blur-sm">
        <div className="flex items-center h-14 px-4">
          {/* Back Button & Device Info */}
          <div className="flex items-center gap-4 min-w-[280px]">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
                  <Monitor className="h-4 w-4 text-white" />
                </div>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0f0f0f]",
                  isConnected ? "bg-green-500" : "bg-slate-500"
                )} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{device.name}</span>
                <span className="text-[11px] text-slate-500">
                  {systemInfo?.ip_address || device.ip_address || "Connecting..."}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex-1 flex items-center justify-center">
            <nav className="flex items-center bg-slate-900/50 rounded-lg p-1 border border-slate-800">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Right Side - Status & Actions */}
          <div className="flex items-center gap-3 min-w-[280px] justify-end">
            {/* Connection Status */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              isConnected 
                ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
            )}>
              <Circle className={cn("h-2 w-2 fill-current", isConnected && "animate-pulse")} />
              {isConnected ? "Connected" : "Offline"}
            </div>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-green-400" />
                <span className="text-xs font-medium text-white">
                  {systemInfo ? Math.round(systemInfo.cpu_usage) : '--'}%
                </span>
              </div>
              <div className="w-px h-3 bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <MemoryStick className="h-3 w-3 text-blue-400" />
                <span className="text-xs font-medium text-white">
                  {systemInfo ? Math.round(systemInfo.ram_percent) : '--'}%
                </span>
              </div>
            </div>

            {/* Actions */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6">
        {/* Connection Warning */}
        {!isConnected && (
          <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            <p className="text-sm text-yellow-400">Connecting to device...</p>
          </div>
        )}

        {/* Tab Content */}
        <div className="h-[80vh] overflow-y-auto scrollbar-hide">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Metrics Row */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {/* CPU */}
                <Card className="border-slate-800 bg-[#111111] overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
                          <Cpu className="h-4 w-4 text-green-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-400">CPU</span>
                      </div>
                      <span className="text-2xl font-bold text-white">
                        {systemInfo ? Math.round(systemInfo.cpu_usage) : '--'}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                        style={{ width: `${systemInfo ? systemInfo.cpu_usage : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {systemInfo ? `${systemInfo.cpu_cores} cores` : 'Loading...'}
                    </p>
                  </CardContent>
                </Card>

                {/* Memory */}
                <Card className="border-slate-800 bg-[#111111] overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                          <MemoryStick className="h-4 w-4 text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Memory</span>
                      </div>
                      <span className="text-2xl font-bold text-white">
                        {systemInfo ? Math.round(systemInfo.ram_percent) : '--'}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                        style={{ width: `${systemInfo ? systemInfo.ram_percent : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {systemInfo 
                        ? `${(systemInfo.ram_used / 1024 / 1024 / 1024).toFixed(1)} / ${(systemInfo.ram_total / 1024 / 1024 / 1024).toFixed(1)} GB`
                        : 'Loading...'}
                    </p>
                  </CardContent>
                </Card>

                {/* Disk */}
                <Card className="border-slate-800 bg-[#111111] overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
                          <HardDrive className="h-4 w-4 text-purple-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Disk</span>
                      </div>
                      <span className="text-2xl font-bold text-white">
                        {systemInfo ? Math.round(systemInfo.disk_percent) : '--'}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                        style={{ width: `${systemInfo ? systemInfo.disk_percent : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {systemInfo 
                        ? `${(systemInfo.disk_used / 1024 / 1024 / 1024).toFixed(0)} / ${(systemInfo.disk_total / 1024 / 1024 / 1024).toFixed(0)} GB`
                        : 'Loading...'}
                    </p>
                  </CardContent>
                </Card>

                {/* Uptime */}
                <Card className="border-slate-800 bg-[#111111] overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                          <Clock className="h-4 w-4 text-amber-400" />
                        </div>
                        <span className="text-sm font-medium text-slate-400">Uptime</span>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {systemInfo ? formatUptime(systemInfo.uptime) : '--'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">System running</p>
                  </CardContent>
                </Card>
              </div>

              {/* System Info Grid */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* System Details */}
                <Card className="border-slate-800 bg-[#111111] lg:col-span-2">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Server className="h-4 w-4 text-blue-400" />
                      System Details
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                        <Monitor className="h-4 w-4 text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-500 uppercase tracking-wider">OS</p>
                          <p className="text-sm font-medium text-white truncate">
                            {systemInfo?.platform || device.os_version || "Loading..."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                        <User className="h-4 w-4 text-green-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-500 uppercase tracking-wider">User</p>
                          <p className="text-sm font-medium text-white truncate">
                            {systemInfo?.username || device.windows_username || "Loading..."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                        <MapPin className="h-4 w-4 text-purple-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-500 uppercase tracking-wider">IP Address</p>
                          <p className="text-sm font-medium text-white font-mono truncate">
                            {systemInfo?.ip_address || device.ip_address || "Loading..."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/50">
                        <Server className="h-4 w-4 text-amber-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Hostname</p>
                          <p className="text-sm font-medium text-white truncate">
                            {systemInfo?.hostname || device.hostname || "Loading..."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-slate-800 bg-[#111111]">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Power className="h-4 w-4 text-red-400" />
                      Quick Actions
                    </h3>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-10 border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800"
                        onClick={() => setActiveTab("screen")}
                      >
                        <Eye className="h-4 w-4 text-cyan-400" />
                        View Screen
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-10 border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800"
                        onClick={() => setActiveTab("shell")}
                      >
                        <Terminal className="h-4 w-4 text-green-400" />
                        Open Terminal
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-10 border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800"
                        onClick={() => setActiveTab("files")}
                      >
                        <FolderTree className="h-4 w-4 text-yellow-400" />
                        Browse Files
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Row */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-[#111111] border border-slate-800">
                  <Wifi className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider">Status</p>
                    <p className="text-sm font-medium text-white capitalize">{device.connection_status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-[#111111] border border-slate-800">
                  <Calendar className="h-5 w-5 text-cyan-400" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider">Last Seen</p>
                    <p className="text-sm font-medium text-white">{new Date(device.last_seen).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-[#111111] border border-slate-800">
                  <Activity className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider">Latency</p>
                    <p className="text-sm font-medium text-white">12ms</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "files" && <FileManager deviceId={device.id} userId={userId} />}
          {activeTab === "screen" && <ScreenViewer deviceId={device.id} deviceName={device.name} />}
          {activeTab === "shell" && <ProfessionalTerminal deviceId={device.id} userId={userId} />}
          {activeTab === "services" && <ServicesManager deviceId={device.id} userId={userId} />}
          {activeTab === "tasks" && <TaskManager deviceId={device.id} userId={userId} />}
        </div>
      </main>
    </div>
  )
}
