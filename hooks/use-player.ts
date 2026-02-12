'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Hls from 'hls.js'
import { PLAYER_RETRY_COUNT, BUFFER_CONFIG } from '@/lib/constants'

interface PlayerState {
  isReady: boolean
  isPlaying: boolean
  error: string | null
  retryCount: number
}

export function usePlayer() {
  const hlsRef = useRef<Hls | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [state, setState] = useState<PlayerState>({
    isReady: false,
    isPlaying: false,
    error: null,
    retryCount: 0,
  })

  const destroyPlayer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    setState({
      isReady: false,
      isPlaying: false,
      error: null,
      retryCount: 0,
    })
  }, [])

  const initPlayer = useCallback(
    (videoEl: HTMLVideoElement, streamUrl: string, startPosition?: number) => {
      destroyPlayer()
      videoRef.current = videoEl

      // For non-HLS URLs (mp4, mkv), use native playback
      if (
        !streamUrl.endsWith('.m3u8') &&
        !streamUrl.includes('.m3u8?')
      ) {
        videoEl.src = streamUrl
        if (startPosition && startPosition > 0) {
          videoEl.currentTime = startPosition
        }
        videoEl.play().catch(() => {})
        setState((s) => ({ ...s, isReady: true }))
        return
      }

      if (!Hls.isSupported()) {
        // Fallback for Safari native HLS
        videoEl.src = streamUrl
        if (startPosition && startPosition > 0) {
          videoEl.currentTime = startPosition
        }
        videoEl.play().catch(() => {})
        setState((s) => ({ ...s, isReady: true }))
        return
      }

      const hls = new Hls({
        maxBufferLength: BUFFER_CONFIG.maxBufferLength,
        maxMaxBufferLength: BUFFER_CONFIG.maxMaxBufferLength,
        maxBufferSize: BUFFER_CONFIG.maxBufferSize,
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: -1, // Auto quality
      })

      hlsRef.current = hls

      hls.loadSource(streamUrl)
      hls.attachMedia(videoEl)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setState((s) => ({ ...s, isReady: true }))
        if (startPosition && startPosition > 0) {
          videoEl.currentTime = startPosition
        }
        videoEl.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return

        setState((prev) => {
          const nextRetry = prev.retryCount + 1

          if (nextRetry > PLAYER_RETRY_COUNT) {
            return {
              ...prev,
              error: 'Stream unavailable after multiple retries',
              retryCount: nextRetry,
            }
          }

          // Exponential backoff retry
          const delay = Math.pow(2, nextRetry - 1) * 1000
          retryTimerRef.current = setTimeout(() => {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad()
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError()
            } else {
              // Fatal error - reinitialize
              hls.destroy()
              const newHls = new Hls({
                maxBufferLength: BUFFER_CONFIG.maxBufferLength,
                maxMaxBufferLength: BUFFER_CONFIG.maxMaxBufferLength,
                maxBufferSize: BUFFER_CONFIG.maxBufferSize,
              })
              hlsRef.current = newHls
              newHls.loadSource(streamUrl)
              newHls.attachMedia(videoEl)
            }
          }, delay)

          return { ...prev, retryCount: nextRetry, error: null }
        })
      })
    },
    [destroyPlayer]
  )

  const retry = useCallback(
    (streamUrl: string) => {
      if (videoRef.current) {
        setState({
          isReady: false,
          isPlaying: false,
          error: null,
          retryCount: 0,
        })
        initPlayer(videoRef.current, streamUrl)
      }
    },
    [initPlayer]
  )

  useEffect(() => {
    return () => {
      destroyPlayer()
    }
  }, [destroyPlayer])

  return {
    ...state,
    initPlayer,
    destroyPlayer,
    retry,
    hlsRef,
    videoRef,
  }
}
