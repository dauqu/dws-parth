"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Shield, Copy, Check } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const router = useRouter()

  const TEST_EMAIL = "demo@devicedashboard.com"
  const TEST_PASSWORD = "demo123456"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Skip authentication - go directly to dashboard
    setTimeout(() => {
      router.push("/dashboard")
    }, 300)
  }

  const handleDemoMode = () => {
    router.push("/dashboard/demo")
  }

  const fillDemoCredentials = () => {
    setEmail(TEST_EMAIL)
    setPassword(TEST_PASSWORD)
    setError(null)
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 ring-1 ring-blue-500/20">
            <Shield className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Device Dashboard</h1>
          <p className="text-sm text-slate-400">Windows Remote Management System</p>
        </div>

        <Card className="mb-4 border-blue-900/50 bg-blue-950/20 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-blue-300">Test Credentials</h3>
              </div>
              <div className="space-y-2 rounded-lg bg-slate-950/50 p-3 font-mono text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-slate-500">Email:</div>
                    <div className="text-slate-300">{TEST_EMAIL}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200"
                    onClick={() => copyToClipboard(TEST_EMAIL, "email")}
                  >
                    {copiedField === "email" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-slate-500">Password:</div>
                    <div className="text-slate-300">{TEST_PASSWORD}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200"
                    onClick={() => copyToClipboard(TEST_PASSWORD, "password")}
                  >
                    {copiedField === "password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full border-blue-800 bg-blue-950/30 text-blue-300 hover:bg-blue-900/50 hover:text-blue-200"
                onClick={fillDemoCredentials}
              >
                Auto-fill Credentials
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Sign In</CardTitle>
            <CardDescription className="text-slate-400">Enter your credentials to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-slate-200">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-slate-700 bg-slate-950/50 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-slate-200">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-700 bg-slate-950/50 text-white"
                  />
                </div>
                {error && (
                  <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900/50 px-2 text-slate-500">Or</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={handleDemoMode}
                >
                  Continue as Demo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
