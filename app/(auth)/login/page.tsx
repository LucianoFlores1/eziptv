'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { XtreamApiError } from '@/lib/xtream-api'
import { toast } from 'sonner'
import { Tv, Loader2, Eye, EyeOff, PlayCircle } from 'lucide-react'

export default function LoginPage() {
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!server.trim() || !username.trim() || !password.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setIsConnecting(true)
    try {
      await login(server.trim(), username.trim(), password.trim())
      toast.success('Connected successfully')
      router.replace('/dashboard')
    } catch (error) {
      if (error instanceof XtreamApiError) {
        switch (error.code) {
          case 'AUTH_FAILED':
            toast.error('Invalid credentials')
            break
          case 'TIMEOUT':
            toast.error('Connection timed out')
            break
          case 'NETWORK':
            toast.error('Server unreachable')
            break
          default:
            toast.error(error.message)
        }
      } else {
        toast.error('An unexpected error occurred')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Tv className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">EzIPTV</h1>
          <p className="text-sm text-muted-foreground">
            Connect to your IPTV service
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="server"
              className="text-sm font-medium text-foreground"
            >
              Server URL
            </label>
            <input
              id="server"
              type="text"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="http://example.com:8080"
              className="h-11 rounded-lg border border-input bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isConnecting}
              autoComplete="url"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="username"
              className="text-sm font-medium text-foreground"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="h-11 rounded-lg border border-input bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isConnecting}
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="h-11 w-full rounded-lg border border-input bg-secondary px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isConnecting}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showPassword ? 'Hide password' : 'Show password'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isConnecting}
            className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => router.push('/player/demo')}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary font-medium text-secondary-foreground transition-colors hover:bg-accent"
        >
          <PlayCircle className="h-4 w-4" />
          Guest Demo (Test Player)
        </button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your credentials are encrypted and stored locally on your device.
        </p>
      </div>
    </div>
  )
}
