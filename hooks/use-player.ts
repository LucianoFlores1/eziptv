'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Hls from 'hls.js'
import { PLAYER_RETRY_COUNT, BUFFER_CONFIG } from '@/lib/constants'
import { isHlsUrl, buildStreamUrlCandidates } from '@/lib/utils'

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
  const candidatesRef = useRef<string[]>([])
  const candidateIdxRef = useRef(0)
  const startPosRef = useRef(0)

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
    candidatesRef.current = []
    candidateIdxRef.current = 0
    setState({
      isReady: false,
      isPlaying: false,
      error: null,
      retryCount: 0,
    })
  }, [])

  /**
   * Try the next URL candidate. Returns true if there was a candidate to try.
   */
  const tryNextCandidate = useCallback((videoEl: HTMLVideoElement): boolean => {
    const idx = candidateIdxRef.current + 1
    if (idx >= candidatesRef.current.length) return false
    candidateIdxRef.current = idx
    const nextUrl = candidatesRef.current[idx]

    // Destroy current HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Re-init with next candidate
    loadUrl(videoEl, nextUrl, startPosRef.current)
    return true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Load a single URL into the video element (HLS.js or native).
   */
  const loadUrl = useCallback(
    (videoEl: HTMLVideoElement, url: string, startPosition?: number) => {
      // ---- Native playback (mp4 / mkv / webm / mov / ts / non-m3u8) ----
      if (!isHlsUrl(url)) {
        videoEl.src = url
        if (startPosition && startPosition > 0) {
          videoEl.currentTime = startPosition
        }

        const onCanPlay = () => {
          setState((s) => ({ ...s, isReady: true }))
          videoEl.play().catch(() => {})
          videoEl.removeEventListener('canplay', onCanPlay)
        }

        const onNativeError = () => {
          videoEl.removeEventListener('error', onNativeError)
          videoEl.removeEventListener('canplay', onCanPlay)
          // Try next candidate URL before giving up
          if (!tryNextCandidate(videoEl)) {
            setState((s) => ({
              ...s,
              error:
                'Playback failed. The format may not be supported by your browser, or the server blocked the request.',
            }))
          }
        }

        videoEl.addEventListener('canplay', onCanPlay)
        videoEl.addEventListener('error', onNativeError)
        videoEl.load()
        return
      }

      // ---- HLS playback (.m3u8) ----
      if (!Hls.isSupported()) {
        // Safari native HLS
        videoEl.src = url
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
        startLevel: -1,
      })

      hlsRef.current = hls
      hls.loadSource(url)
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
            // All retries exhausted on this candidate - try next URL
            if (tryNextCandidate(videoEl)) {
              return { ...prev, retryCount: 0, error: null }
            }
            return {
              ...prev,
              error: 'Stream unavailable after multiple retries',
              retryCount: nextRetry,
            }
          }

          const delay = Math.pow(2, nextRetry - 1) * 1000
          retryTimerRef.current = setTimeout(() => {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad()
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError()
            } else {
              hls.destroy()
              const newHls = new Hls({
                maxBufferLength: BUFFER_CONFIG.maxBufferLength,
                maxMaxBufferLength: BUFFER_CONFIG.maxMaxBufferLength,
                maxBufferSize: BUFFER_CONFIG.maxBufferSize,
              })
              hlsRef.current = newHls
              newHls.loadSource(url)
              newHls.attachMedia(videoEl)
            }
          }, delay)

          return { ...prev, retryCount: nextRetry, error: null }
        })
      })
    },
    [tryNextCandidate]
  )

  const initPlayer = useCallback(
    (videoEl: HTMLVideoElement, streamUrl: string, startPosition?: number) => {
      destroyPlayer()
      videoRef.current = videoEl
      startPosRef.current = startPosition || 0

      // Build ordered list of URL candidates (HTTPS first, then HTTP, then proxy)
      candidatesRef.current = buildStreamUrlCandidates(streamUrl)
      candidateIdxRef.current = 0

      const firstUrl = candidatesRef.current[0] || streamUrl
      loadUrl(videoEl, firstUrl, startPosition)
    },
    [destroyPlayer, loadUrl]
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
