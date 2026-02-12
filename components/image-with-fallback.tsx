'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Film } from 'lucide-react'

interface ImageWithFallbackProps {
  src: string | undefined
  alt: string
  className?: string
  iconSize?: number
}

export function ImageWithFallback({
  src,
  alt,
  className,
  iconSize = 24,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (!src || error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-secondary',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <Film
          className="text-muted-foreground"
          size={iconSize}
        />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-secondary', className)}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="text-muted-foreground animate-pulse" size={iconSize} />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
