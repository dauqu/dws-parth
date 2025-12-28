import { DeviceGrid } from "@/components/device-grid"
import { DashboardHeader } from "@/components/dashboard-header"
import type { Device } from "@/lib/types"

export default function DemoDashboardPage() {
  const demoDevices: Device[] = [
    {
      id: "demo-1",
      user_id: "demo-user",
      name: "Production Server 01",
      hostname: "WIN-PROD-01",
      ip_address: "192.168.1.100",
      os_version: "Windows Server 2022",
      status: "online",
      connection_status: "connected",
      last_seen: new Date().toISOString(),
      windows_username: "Administrator",
      wallpaper_url: "/windows-server-datacenter-blue.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-2",
      user_id: "demo-user",
      name: "Development Workstation",
      hostname: "WIN-DEV-02",
      ip_address: "192.168.1.101",
      os_version: "Windows 11 Pro",
      status: "online",
      connection_status: "connected",
      last_seen: new Date().toISOString(),
      windows_username: "john.smith",
      wallpaper_url: "/windows-11-gradient-purple.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-3",
      user_id: "demo-user",
      name: "Database Server",
      hostname: "WIN-DB-03",
      ip_address: "192.168.1.102",
      os_version: "Windows Server 2019",
      status: "maintenance",
      connection_status: "disconnected",
      last_seen: new Date(Date.now() - 3600000).toISOString(),
      windows_username: "dbadmin",
      wallpaper_url: "/abstract-database-dark-green.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-4",
      user_id: "demo-user",
      name: "Web Server 01",
      hostname: "WIN-WEB-04",
      ip_address: "192.168.1.103",
      os_version: "Windows Server 2022",
      status: "online",
      connection_status: "connected",
      last_seen: new Date().toISOString(),
      windows_username: "webadmin",
      wallpaper_url: "/cloud-server-technology-orange.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-5",
      user_id: "demo-user",
      name: "Backup Server",
      hostname: "WIN-BACKUP-05",
      ip_address: "192.168.1.104",
      os_version: "Windows Server 2019",
      status: "offline",
      connection_status: "error",
      last_seen: new Date(Date.now() - 7200000).toISOString(),
      windows_username: "backup_svc",
      wallpaper_url: "/dark-tech-red-abstract.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "demo-6",
      user_id: "demo-user",
      name: "Testing Environment",
      hostname: "WIN-TEST-06",
      ip_address: "192.168.1.105",
      os_version: "Windows 10 Enterprise",
      status: "online",
      connection_status: "connected",
      last_seen: new Date().toISOString(),
      windows_username: "testuser",
      wallpaper_url: "/windows-10-default-blue-wallpaper.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const demoUser = {
    id: "demo-user",
    email: "demo@example.com",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <DashboardHeader user={demoUser} isDemo />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
            <p className="text-sm text-amber-400">
              <span className="font-semibold">Demo Mode:</span> You're viewing sample data. Sign up to manage real
              devices.
            </p>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-white">Device Management</h1>
          <p className="text-slate-400">Monitor and control your Windows devices</p>
        </div>
        <DeviceGrid devices={demoDevices} />
      </main>
    </div>
  )
}
