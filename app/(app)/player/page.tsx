'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { xtreamApi } from '@/lib/xtream-api'
import { VideoPlayer } from '@/components/video-player'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useEffect, useState } from 'react'
import { db } from '@/lib/db'

function PlayerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { credentials } = useAuth()

  const type = searchParams.get('type') as 'live' | 'vod' | 'series'
  const id = searchParams.get('id')
  const ext = searchParams.get('ext') || 'mp4'
  const resumeParam = searchParams.get('resume')

  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [title, setTitle] = useState<string>('')
  const [startPosition, setStartPosition] = useState<number>(0)

  useEffect(() => {
    async function setup() {
      if (!credentials || !id || !type) return

      const streamId = parseInt(id, 10)
      const url = xtreamApi.getStreamUrl(credentials, streamId, type, ext)
      setStreamUrl(url)

      if (resumeParam) {
        setStartPosition(parseFloat(resumeParam))
      }

      // Get title
      try {
        if (type === 'live') {
          const ch = await db.channels.get(streamId)
          setTitle(ch?.name ?? '')
        } else if (type === 'vod') {
          const mv = await db.movies.get(streamId)
          setTitle(mv?.name ?? '')
        } else {
          // For series, the id might be the episode id - try to find it
          setTitle('Episode')
        }
      } catch {
        // ignore
      }
    }
    setup()
  }, [credentials, id, type, ext, resumeParam])

  if (!type || !id) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Invalid player parameters</p>
      </div>
    )
  }

  if (!streamUrl) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <LoadingSpinner label="Preparing stream..." />
      </div>
    )
  }

  return (
    <div className="h-dvh w-full bg-black md:h-[calc(100dvh)]">
      <VideoPlayer
        streamUrl={streamUrl}
        contentId={parseInt(id, 10)}
        contentType={type}
        startPosition={startPosition}
        onBack={() => router.back()}
        title={title}
      />
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-black">
          <LoadingSpinner label="Loading player..." />
        </div>
      }
    >
      <PlayerContent />
    </Suspense>
  )
}
