'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { AppShell } from '@/components/app-shell'
import { LoadingSpinner } from '@/components/loading-spinner'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <LoadingSpinner label="Checking session..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <AppShell>{children}</AppShell>
}
