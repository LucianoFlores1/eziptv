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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const { isReady, error, initPlayer, destroyPlayer, retry } = usePlayer()
  const { savePosition } = usePlayback()

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seekValue, setSeekValue] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)

  const isLive = contentType === 'live'

  // Initialize player
  useEffect(() => {
    if (videoElRef.current) {
      initPlayer(videoElRef.current, streamUrl, startPosition)
    }
    return () => {
      destroyPlayer()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl])

  // Save playback position periodically
  useEffect(() => {
    if (isLive) return
    saveTimerRef.current = setInterval(() => {
      if (videoElRef.current && !videoElRef.current.paused) {
        savePosition(
          contentId,
          contentType,
          videoElRef.current.currentTime,
          videoElRef.current.duration || 0
        )
      }
    }, PLAYBACK_SAVE_INTERVAL)

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current)
      // Save final position on unmount
      if (videoElRef.current) {
        savePosition(
          contentId,
          contentType,
          videoElRef.current.currentTime,
          videoElRef.current.duration || 0
        )
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, contentType, isLive])

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (!videoElRef.current?.paused) {
        setShowControls(false)
      }
    }, 3000)
  }, [])

  const togglePlay = useCallback(() => {
    if (!videoElRef.current) return
    if (videoElRef.current.paused) {
      videoElRef.current.play().catch(() => {})
    } else {
      videoElRef.current.pause()
    }
    resetControlsTimer()
  }, [resetControlsTimer])

  const toggleMute = useCallback(() => {
    if (!videoElRef.current) return
    videoElRef.current.muted = !videoElRef.current.muted
    setIsMuted(videoElRef.current.muted)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen().catch(() => {})
    }
  }, [])

  const handleSeek = useCallback((value: number) => {
    if (!videoElRef.current) return
    videoElRef.current.currentTime = value
    setCurrentTime(value)
    setIsSeeking(false)
  }, [])

  // Video event listeners
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
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-sm font-medium text-foreground text-center">
          {error}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => retry(streamUrl)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
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
        autoPlay
      />

      {/* Loading indicator */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted-foreground border-t-primary" />
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
            <p className="text-sm font-medium text-white truncate">{title}</p>
          )}
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
