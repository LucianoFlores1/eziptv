'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/loading-spinner'

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="flex h-dvh items-center justify-center bg-blue-600">
      <LoadingSpinner label="Loading..." />
    </div>
  )
}
