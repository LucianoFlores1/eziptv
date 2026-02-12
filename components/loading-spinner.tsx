'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  className?: string
  label?: string
}

export function LoadingSpinner({ className, label }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
    </div>
  )
}
