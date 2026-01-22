"use client"

import { useState, useEffect } from "react"
import { Trash2, RotateCcw, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDeletedDevices, restoreDevice, permanentlyDeleteDevice } from "@/lib/api-client"
import type { Device } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

export function DeviceBin() {
  const [deletedDevices, setDeletedDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null)

  const loadDeletedDevices = async () => {
    try {
      setLoading(true)
      const devices = await fetchDeletedDevices()
      setDeletedDevices(devices)
    } catch (error) {
      console.error("Failed to load deleted devices:", error)
      toast({
        title: "Error",
        description: "Failed to load deleted devices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeletedDevices()
  }, [])

  const handleRestore = async (deviceId: string) => {
    try {
      await restoreDevice(deviceId)
      toast({
        title: "Success",
        description: "Device restored successfully",
      })
      loadDeletedDevices()
    } catch (error) {
      console.error("Failed to restore device:", error)
      toast({
        title: "Error",
        description: "Failed to restore device",
        variant: "destructive",
      })
    }
  }

  const handlePermanentDelete = async () => {
    if (!deviceToDelete) return

    try {
      await permanentlyDeleteDevice(deviceToDelete)
      toast({
        title: "Success",
        description: "Device permanently deleted",
      })
      setDeviceToDelete(null)
      loadDeletedDevices()
    } catch (error) {
      console.error("Failed to permanently delete device:", error)
      toast({
        title: "Error",
        description: "Failed to permanently delete device",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Recycle Bin
          </CardTitle>
          <CardDescription>Deleted devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Recycle Bin
          </CardTitle>
          <CardDescription>
            {deletedDevices.length} deleted device{deletedDevices.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deletedDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No deleted devices</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.hostname}</TableCell>
                    <TableCell>{device.label || "-"}</TableCell>
                    <TableCell>{device.ip_address}</TableCell>
                    <TableCell>
                      {device.deleted_at ? formatDate(device.deleted_at) : "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(device.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeviceToDelete(device.id)}
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Delete Forever
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the device and remove
              all associated data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
