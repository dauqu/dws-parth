"use client"

import { use, useEffect, useState } from "react";
import { DeviceDetailLayout } from "@/components/device-detail-layout";
import { DashboardHeader } from "@/components/dashboard-header";
import type { Device } from "@/lib/types";

/**
 * App Router page props
 */
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Client Component - connects directly to backend via WebSocket
 */
export default function DeviceDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Device page mounted for ID:', resolvedParams.id);
    
    // Create a mock device with the ID - all real data will come from WebSocket
    const mockDevice: Device = {
      id: resolvedParams.id,
      user_id: "default_user",
      name: "Loading...",
      hostname: "Loading...",
      ip_address: "Loading...",
      os_version: "Loading...",
      status: "online",
      connection_status: "connected",
      last_seen: new Date().toISOString(),
      windows_username: "Loading...",
      wallpaper_url: "/windows-11-gradient-purple.jpg",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setDevice(mockDevice);
    setLoading(false);
  }, [resolvedParams.id]);

  return (
    <>
      <DashboardHeader user={{ id: "user-1", email: "user@example.com" }} />

      {loading && (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-slate-400">Connecting to device...</p>
          </div>
        </div>
      )}

      {!loading && device && (
        <DeviceDetailLayout device={device} userId="user-1" />
      )}
    </>
  );
}
