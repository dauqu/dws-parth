"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User, Shield, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { NotificationCenter } from "@/components/notification-center"
import { useToast } from "@/hooks/use-toast"

interface DashboardHeaderProps {
  user: { id: string; email: string }
  isDemo?: boolean
}

export function DashboardHeader({ user, isDemo = false }: DashboardHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleSignOut = async () => {
    router.push("/login")
  }

  const handleAddDevice = () => {
    toast({
      title: "Add New Device",
      description: "Device registration wizard will open soon...",
    })
  }

  const initials = user.email?.substring(0, 2).toUpperCase() || "AD"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 ring-1 ring-blue-500/20">
            <Shield className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Device Dashboard</h2>
            <p className="text-xs text-slate-500">Remote Management</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleAddDevice} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
          <NotificationCenter />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-slate-700">
                  <AvatarFallback className="bg-blue-600 text-white">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 border-slate-800 bg-slate-900" align="end">
              <DropdownMenuLabel className="text-slate-200">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{isDemo ? "Demo Mode" : "My Account"}</p>
                  <p className="text-xs font-normal text-slate-400">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              {!isDemo && (
                <DropdownMenuItem className="text-slate-300 focus:bg-slate-800 focus:text-white">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-400 focus:bg-red-950/20 focus:text-red-400" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {isDemo ? "Exit Demo" : "Sign Out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
