'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { usePlayer } from '@/hooks/use-player'
import { usePlayback } from '@/hooks/use-playback'
import { PLAYBACK_SAVE_INTERVAL } from '@/lib/constants'
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  MonitorPlay,
} from 'lucide-react'
import { cn, isHlsUrl, isValidStreamUrl } from '@/lib/utils'

interface VideoPlayerProps {
  streamUrl: string
  contentId: number
  contentType: 'live' | 'vod' | 'series'
  startPosition?: number
  onBack: () => void
  title?: string
}

export function VideoPlayer({
  streamUrl,
  contentId,
  contentType,
  startPosition,
  onBack,
  title,
}: VideoPlayerProps) {
  const videoElRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { isReady, error, initPlayer, destroyPlayer, retry, mode, activeUrl } =
    usePlayer()
  const { savePosition } = usePlayback()

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seekValue, setSeekValue] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [copied, setCopied] = useState(false)

  const isLive = contentType === 'live'
  const isHls = isHlsUrl(streamUrl)
  const isMkv = streamUrl.toLowerCase().includes('.mkv')

  // The URL the user should copy / open externally
  const externalUrl = activeUrl || streamUrl

  // ----- Clipboard copy -----
  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(externalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = externalUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [externalUrl])

  // ----- Initialise the player once the <video> element is in the DOM -----
  useEffect(() => {
    const videoEl = videoElRef.current
    if (!videoEl) return
    if (!isValidStreamUrl(streamUrl)) return

    initPlayer(videoEl, streamUrl, startPosition)

    return () => {
      destroyPlayer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl])

  // ----- Save playback position periodically (VOD / Series only) -----
  useEffect(() => {
    if (isLive) return

    saveTimerRef.current = setInterval(() => {
      const video = videoElRef.current
      if (video && !video.paused) {
        savePosition(contentId, contentType, video.currentTime, video.duration || 0)
      }
    }, PLAYBACK_SAVE_INTERVAL)

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current)
      const video = videoElRef.current
      if (video) {
        savePosition(contentId, contentType, video.currentTime, video.duration || 0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, contentType, isLive])

  // ----- Auto-hide controls -----
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (!videoElRef.current?.paused) setShowControls(false)
    }, 3000)
  }, [])

  // ----- Transport controls -----
  const togglePlay = useCallback(() => {
    const v = videoElRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
    resetControlsTimer()
  }, [resetControlsTimer])

  const toggleMute = useCallback(() => {
    const v = videoElRef.current
    if (!v) return
    v.muted = !v.muted
    setIsMuted(v.muted)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current.requestFullscreen().catch(() => {})
  }, [])

  const handleSeek = useCallback((value: number) => {
    const v = videoElRef.current
    if (!v) return
    v.currentTime = value
    setCurrentTime(value)
    setIsSeeking(false)
  }, [])

  // ----- Wire up <video> DOM events -----
  useEffect(() => {
    const video = videoElRef.current
    if (!video) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(video.currentTime)
        setSeekValue(video.currentTime)
      }
    }
    const onDurationChange = () => setDuration(video.duration || 0)
    const onFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement)

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [isSeeking])

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0)
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // =====================================================================
  // External player action bar (shown in error state AND in the controls)
  // =====================================================================
  const ExternalActions = ({ className }: { className?: string }) => (
    <div className={cn('flex flex-wrap items-center justify-center gap-2', className)}>
      {/* VLC protocol link (works on desktop & Android with VLC installed) */}
      <a
        href={`vlc://${externalUrl}`}
        className="flex h-10 items-center gap-2 rounded-lg bg-[#ff8800] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-4 w-4" />
        Open in VLC
      </a>

      {/* Android intent:// for VLC */}
      <a
        href={`intent://${externalUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=org.videolan.vlc;end`}
        className="flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        onClick={(e) => e.stopPropagation()}
      >
        <MonitorPlay className="h-4 w-4" />
        Android VLC
      </a>

      {/* Copy Stream URL */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleCopyUrl()
        }}
        className="flex h-10 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied!' : 'Copy Stream URL'}
      </button>

      {/* Direct download for non-HLS VOD */}
      {!isHls && contentType === 'vod' && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <ArrowLeft className="h-4 w-4 rotate-[-90deg]" />
          Download
        </a>
      )}
    </div>
  )

  // =====================================================================
  // Error state
  // =====================================================================
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 bg-background p-6">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-sm font-medium text-foreground text-center max-w-sm">
          {error}
        </p>

        {isMkv && (
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            MKV format has limited browser support. Use VLC or PotPlayer for
            reliable playback, or try a Chromium-based browser.
          </p>
        )}

        {/* Prominent external player buttons */}
        <ExternalActions />

        <div className="flex gap-3">
          <button
            onClick={() => retry(streamUrl)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Retry in Browser
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // =====================================================================
  // Invalid URL
  // =====================================================================
  if (!isValidStreamUrl(streamUrl)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-6">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-sm font-medium text-foreground text-center">
          Invalid stream URL
        </p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
        >
          Go Back
        </button>
      </div>
    )
  }

  // =====================================================================
  // Player
  // =====================================================================
  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-black"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={togglePlay}
    >
      <video
        ref={videoElRef}
        className="h-full w-full object-contain"
        playsInline
      />

      {/* Loading indicator */}
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted-foreground border-t-primary" />
          {mode && (
            <span className="text-xs text-muted-foreground">
              {mode === 'hls' ? 'Loading HLS stream...' : 'Loading video...'}
            </span>
          )}
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute inset-0 flex flex-col justify-between transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {title && (
            <p className="text-sm font-medium text-white truncate flex-1">
              {title}
            </p>
          )}

          {/* Top-right action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCopyUrl()
              }}
              className="flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs text-white hover:bg-white/20 transition-colors"
              title="Copy stream URL"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy URL'}</span>
            </button>
            <a
              href={`vlc://${externalUrl}`}
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 items-center gap-1.5 rounded-full bg-[#ff8800]/80 px-3 text-xs font-medium text-white hover:bg-[#ff8800] transition-colors"
              title="Open in VLC"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">VLC</span>
            </a>
          </div>
        </div>

        {/* Center play button */}
        <div className="flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </button>
        </div>

        {/* Bottom controls */}
        <div className="bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
          {/* Progress bar (VOD/Series only) */}
          {!isLive && duration > 0 && (
            <div className="mb-3">
              <input
                type="range"
                min={0}
                max={duration}
                step={1}
                value={isSeeking ? seekValue : currentTime}
                onChange={(e) => {
                  setIsSeeking(true)
                  setSeekValue(Number(e.target.value))
                }}
                onMouseUp={() => handleSeek(seekValue)}
                onTouchEnd={() => handleSeek(seekValue)}
                className="w-full h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                aria-label="Seek"
              />
              <div className="flex justify-between mt-1 text-[10px] text-white/60">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {isLive && (
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-white">LIVE</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-primary transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>

            <button
              onClick={toggleMute}
              className="text-white hover:text-primary transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            <div className="flex-1" />

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-primary transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
