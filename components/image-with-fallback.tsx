'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Film } from 'lucide-react'

interface ImageWithFallbackProps {
  src: string | undefined
  alt: string
  className?: string
  iconSize?: number
  enableCorsProxy?: boolean
}

// Domains that commonly have CORS issues with images
const CORS_PROBLEM_DOMAINS = [
  'image.tmdb.org',
  'themoviedb.org',
  'thetvdb.com',
  'fanart.tv',
]

function shouldUseCorsProxy(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return CORS_PROBLEM_DOMAINS.some((domain) => urlObj.hostname.includes(domain))
  } catch {
    return false
  }
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
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(() => {
    // Pre-emptively use CORS proxy for known problematic domains
    if (src && enableCorsProxy && shouldUseCorsProxy(src)) {
      return `/api/cors-proxy?url=${encodeURIComponent(src)}`
    }
    return src
  })
  const [corsRetried, setCorsRetried] = useState(false)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update currentSrc when src prop changes
  useEffect(() => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    
    // Pre-emptively use CORS proxy for known problematic domains
    if (src && enableCorsProxy && shouldUseCorsProxy(src)) {
      setCurrentSrc(`/api/cors-proxy?url=${encodeURIComponent(src)}`)
      setCorsRetried(true) // Mark as already proxied
    } else {
      setCurrentSrc(src)
      setCorsRetried(false)
    }
    setError(false)
    setLoaded(false)
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [src, enableCorsProxy])

  const handleError = () => {
    // If CORS proxy is enabled and we haven't tried it yet, retry through proxy
    if (enableCorsProxy && !corsRetried && currentSrc && currentSrc.startsWith('http')) {
      setCorsRetried(true)
      // Small delay to prevent rapid retries
      retryTimeoutRef.current = setTimeout(() => {
        const corsProxyUrl = `/api/cors-proxy?url=${encodeURIComponent(currentSrc)}`
        setCurrentSrc(corsProxyUrl)
      }, 50)
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
        referrerPolicy="no-referrer"
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
