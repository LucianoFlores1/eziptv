'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Film } from 'lucide-react'

interface ImageWithFallbackProps {
  src: string | undefined
  alt: string
  className?: string
  iconSize?: number
  enableCorsProxy?: boolean
}

export function ImageWithFallback({
  src,
  alt,
  className,
  iconSize = 24,
  enableCorsProxy = true,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [corsRetried, setCorsRetried] = useState(false)

  // Update currentSrc when src prop changes
  useEffect(() => {
    setCurrentSrc(src)
    setError(false)
    setLoaded(false)
    setCorsRetried(false)
  }, [src])

  const handleError = () => {
    // If CORS proxy is enabled and we haven't tried it yet, retry through proxy
    if (enableCorsProxy && !corsRetried && currentSrc && currentSrc.startsWith('http')) {
      setCorsRetried(true)
      const corsProxyUrl = `/api/cors-proxy?url=${encodeURIComponent(currentSrc)}`
      setCurrentSrc(corsProxyUrl)
    } else {
      setError(true)
    }
  }

  if (!currentSrc || error) {
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
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onError={handleError}
        onLoad={() => setLoaded(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
