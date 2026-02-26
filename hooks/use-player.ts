'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Hls from 'hls.js'
import { PLAYER_RETRY_COUNT, BUFFER_CONFIG } from '@/lib/constants'
import { isHlsUrl, buildStreamUrlCandidates, isValidStreamUrl } from '@/lib/utils'

interface PlayerState {
  isReady: boolean
  isPlaying: boolean
  error: string | null
  retryCount: number
  activeUrl: string | null
  mode: 'hls' | 'native' | null
}

/**
 * Core player hook.
 *
 * Manages the lifecycle for both HLS.js (.m3u8) and native <video> playback
 * (mp4, mkv, webm, mov, ts). Handles HTTPS upgrade → HTTP fallback →
 * CORS-proxy fallback automatically via buildStreamUrlCandidates.
 */
export function usePlayer() {
  const hlsRef = useRef<Hls | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  // These refs avoid stale closures in event handlers
  const candidatesRef = useRef<string[]>([])
  const candidateIdxRef = useRef(0)
  const startPosRef = useRef(0)

  // Stable abort ref – we increment this to invalidate stale async work
  const generationRef = useRef(0)

  const [state, setState] = useState<PlayerState>({
    isReady: false,
    isPlaying: false,
    error: null,
    retryCount: 0,
    activeUrl: null,
    mode: null,
  })

  /* ------------------------------------------------------------------ */
  /*  Cleanup helpers                                                    */
  /* ------------------------------------------------------------------ */

  const clearTimers = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const destroyHls = useCallback(() => {
    clearTimers()
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [clearTimers])

  /**
   * Full teardown – stops everything, resets the <video> element, and
   * clears all state.  Safe to call multiple times.
   */
  const destroyPlayer = useCallback(() => {
    generationRef.current += 1 // invalidate any pending async work
    destroyHls()

    const video = videoRef.current
    if (video) {
      video.removeAttribute('src')
      video.load() // flush any in-flight blob: object URLs held by HLS.js
    }

    candidatesRef.current = []
    candidateIdxRef.current = 0

    if (mountedRef.current) {
      setState({
        isReady: false,
        isPlaying: false,
        error: null,
        retryCount: 0,
        activeUrl: null,
        mode: null,
      })
    }
  }, [destroyHls])

  /* ------------------------------------------------------------------ */
  /*  loadUrl – loads a single candidate into the <video> element        */
  /* ------------------------------------------------------------------ */

  const loadUrl = useCallback(
    (videoEl: HTMLVideoElement, url: string, startPosition: number, gen: number) => {
      // Bail out if a newer init call has been made
      if (gen !== generationRef.current) return

      const hls = isHlsUrl(url)
      setState((s) => ({ ...s, activeUrl: url, mode: hls ? 'hls' : 'native' }))

      /* ---------- Native <video> (mp4 / mkv / webm / mov / ts) -------- */
      if (!hls) {
        // Clean up any previous HLS instance first
        destroyHls()

        videoEl.src = url

        const onCanPlay = () => {
          videoEl.removeEventListener('canplay', onCanPlay)
          videoEl.removeEventListener('error', onError)
          if (gen !== generationRef.current) return
          if (startPosition > 0) videoEl.currentTime = startPosition
          setState((s) => ({ ...s, isReady: true }))
          videoEl.play().catch(() => {})
        }

        const onError = () => {
          videoEl.removeEventListener('canplay', onCanPlay)
          videoEl.removeEventListener('error', onError)
          if (gen !== generationRef.current) return
          advanceCandidate(videoEl, startPosition, gen)
        }

        videoEl.addEventListener('canplay', onCanPlay, { once: true })
        videoEl.addEventListener('error', onError, { once: true })
        videoEl.load()
        return
      }

      /* ---------- Safari native HLS ----------------------------------- */
      if (!Hls.isSupported()) {
        videoEl.src = url
        if (startPosition > 0) videoEl.currentTime = startPosition
        videoEl.play().catch(() => {})
        setState((s) => ({ ...s, isReady: true }))
        return
      }

      /* ---------- HLS.js ---------------------------------------------- */
      destroyHls()

      const hlsInstance = new Hls({
        maxBufferLength: BUFFER_CONFIG.maxBufferLength,
        maxMaxBufferLength: BUFFER_CONFIG.maxMaxBufferLength,
        maxBufferSize: BUFFER_CONFIG.maxBufferSize,
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: -1,
      })

      hlsRef.current = hlsInstance
      hlsInstance.loadSource(url)
      hlsInstance.attachMedia(videoEl)

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        if (gen !== generationRef.current) return
        setState((s) => ({ ...s, isReady: true }))
        if (startPosition > 0) videoEl.currentTime = startPosition
        videoEl.play().catch(() => {})
      })

      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || gen !== generationRef.current) return

        setState((prev) => {
          const nextRetry = prev.retryCount + 1

          if (nextRetry > PLAYER_RETRY_COUNT) {
            // Exhausted retries on this candidate – try next URL
            advanceCandidate(videoEl, startPosition, gen)
            return { ...prev, retryCount: 0, error: null }
          }

          // Exponential back-off retry on the same URL
          const delay = Math.pow(2, nextRetry - 1) * 1000
          clearTimers()
          retryTimerRef.current = setTimeout(() => {
            if (gen !== generationRef.current) return
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hlsInstance.startLoad()
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hlsInstance.recoverMediaError()
            } else {
              // Unrecoverable – rebuild
              hlsInstance.destroy()
              if (gen !== generationRef.current) return
              const fresh = new Hls({
                maxBufferLength: BUFFER_CONFIG.maxBufferLength,
                maxMaxBufferLength: BUFFER_CONFIG.maxMaxBufferLength,
                maxBufferSize: BUFFER_CONFIG.maxBufferSize,
              })
              hlsRef.current = fresh
              fresh.loadSource(url)
              fresh.attachMedia(videoEl)
            }
          }, delay)

          return { ...prev, retryCount: nextRetry, error: null }
        })
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destroyHls, clearTimers]
  )

  /* ------------------------------------------------------------------ */
  /*  advanceCandidate – move to the next fallback URL                   */
  /* ------------------------------------------------------------------ */

  const advanceCandidate = useCallback(
    (videoEl: HTMLVideoElement, startPosition: number, gen: number) => {
      const idx = candidateIdxRef.current + 1
      if (idx >= candidatesRef.current.length) {
        // Nothing left to try
        if (mountedRef.current) {
          setState((s) => ({
            ...s,
            error:
              'Playback failed. The stream may be offline, the format unsupported, or the server blocked the request.',
          }))
        }
        return
      }
      candidateIdxRef.current = idx
      loadUrl(videoEl, candidatesRef.current[idx], startPosition, gen)
    },
    [loadUrl]
  )

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Initialise the player.  Must be called *after* the <video> element is
   * in the DOM (i.e. inside a useEffect or a ref callback).
   */
  const initPlayer = useCallback(
    (videoEl: HTMLVideoElement, streamUrl: string, startPosition?: number) => {
      destroyPlayer()

      if (!videoEl) return
      if (!isValidStreamUrl(streamUrl)) {
        setState((s) => ({
          ...s,
          error: 'Invalid stream URL. Make sure it starts with http:// or https://.',
        }))
        return
      }

      videoRef.current = videoEl
      startPosRef.current = startPosition || 0

      candidatesRef.current = buildStreamUrlCandidates(streamUrl)
      candidateIdxRef.current = 0

      const gen = generationRef.current
      const firstUrl = candidatesRef.current[0] || streamUrl

      // Use a microtask so the caller's render cycle completes first,
      // guaranteeing the DOM is settled and preventing Blob ERR_FILE_NOT_FOUND.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        if (gen !== generationRef.current) return
        loadUrl(videoEl, firstUrl, startPosRef.current, gen)
      })
    },
    [destroyPlayer, loadUrl]
  )

  const retry = useCallback(
    (streamUrl: string) => {
      if (videoRef.current) {
        initPlayer(videoRef.current, streamUrl)
      }
    },
    [initPlayer]
  )

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
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
