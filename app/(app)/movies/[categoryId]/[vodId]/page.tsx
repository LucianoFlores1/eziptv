'use client'

import { use, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { xtreamApi } from '@/lib/xtream-api'
import { useAuth } from '@/hooks/use-auth'
import { useFavorites, useIsFavorite } from '@/hooks/use-favorites'
import { useWatchedStatus } from '@/hooks/use-playback'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { LoadingSpinner } from '@/components/loading-spinner'
import Link from 'next/link'
import {
  ArrowLeft,
  Play,
  Heart,
  Star,
  Clock,
  Calendar,
  User,
  Film,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VodDetail {
  name: string
  plot: string
  cast: string
  director: string
  genre: string
  releaseDate: string
  duration: string
  durationSecs: number
  rating: string
  cover: string
  backdrop: string
}

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string; vodId: string }>
}) {
  const { categoryId, vodId } = use(params)
  const vodIdNum = parseInt(vodId, 10)
  const { credentials } = useAuth()
  const { toggleFavorite } = useFavorites()
  const isFav = useIsFavorite(vodIdNum, 'vod')
  const { position, duration, completed, progress } = useWatchedStatus(
    vodIdNum,
    'vod'
  )

  const movie = useLiveQuery(
    () => db.movies.get(vodIdNum),
    [vodIdNum]
  )

  const [detail, setDetail] = useState<VodDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(true)

  useEffect(() => {
    async function fetchDetail() {
      if (!credentials) return
      try {
        const data = await xtreamApi.getVodInfo(credentials, vodIdNum)
        if (data.info) {
          setDetail(data.info)
        }
      } catch {
        // Fall back to local data
      } finally {
        setIsLoadingDetail(false)
      }
    }
    fetchDetail()
  }, [credentials, vodIdNum])

  if (!movie && isLoadingDetail) {
    return <LoadingSpinner label="Loading movie details..." />
  }

  const title = detail?.name || movie?.name || 'Unknown Movie'
  const poster = detail?.cover || movie?.streamIcon || ''
  const plot = detail?.plot || movie?.plot || ''
  const rating = detail?.rating || movie?.rating || ''
  const genre = detail?.genre || movie?.genre || ''
  const cast = detail?.cast || movie?.cast || ''
  const director = detail?.director || movie?.director || ''
  const releaseDate = detail?.releaseDate || movie?.releaseDate || ''
  const dur = detail?.duration || movie?.duration || ''
  const ext = movie?.containerExtension || 'mp4'
  const isMkv = ext.toLowerCase() === 'mkv'

  // Build a direct stream URL through the API helper so normalizeServer
  // and upgradeToHttps are applied consistently (no malformed protocols).
  const directStreamUrl = credentials
    ? xtreamApi.getStreamUrl(credentials, vodIdNum, 'vod', ext)
    : null

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="pb-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="aspect-video w-full max-h-72 overflow-hidden bg-secondary">
          <ImageWithFallback
            src={detail?.backdrop || poster}
            alt={title}
            className="h-full w-full"
            iconSize={48}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <Link
          href={`/movies/${categoryId}`}
          className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground hover:bg-background transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="px-4 md:px-8 -mt-16 relative z-10">
        <div className="flex gap-4">
          {/* Poster thumbnail */}
          <ImageWithFallback
            src={poster}
            alt={title}
            className="h-32 w-22 shrink-0 rounded-lg shadow-lg"
            iconSize={24}
          />

          <div className="flex-1 min-w-0 pt-8">
            <h1 className="text-xl font-bold text-foreground text-balance">
              {title}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {rating && rating !== '0' && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  {parseFloat(rating).toFixed(1)}
                </span>
              )}
              {dur && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {dur}
                </span>
              )}
              {releaseDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {releaseDate}
                </span>
              )}
            </div>

            {genre && (
              <p className="mt-2 text-xs text-muted-foreground">{genre}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <Link
            href={`/player?type=vod&id=${vodIdNum}&ext=${ext}${
              position > 0 && !completed ? `&resume=${position}` : ''
            }`}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="h-5 w-5" />
            {position > 0 && !completed
              ? `Resume ${formatTime(position)}`
              : 'Play'}
          </Link>
          <button
            onClick={() => toggleFavorite(vodIdNum, 'vod')}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-lg border transition-colors',
              isFav
                ? 'border-primary bg-primary/10'
                : 'border-border bg-secondary hover:bg-accent'
            )}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={cn(
                'h-5 w-5',
                isFav ? 'fill-primary text-primary' : 'text-muted-foreground'
              )}
            />
          </button>

          {/* External playback options for MKV / non-HLS files */}
          {isMkv && directStreamUrl && (
            <>
              <a
                href={directStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-accent transition-colors"
                title="Open in new browser tab"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">New Tab</span>
              </a>
              <a
                href={`vlc://${directStreamUrl}`}
                className="flex h-11 items-center gap-2 rounded-lg border border-[#ff8800]/40 bg-[#ff8800]/10 px-3 text-sm font-medium text-[#ff8800] hover:bg-[#ff8800]/20 transition-colors"
                title="Open in VLC Player"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">VLC</span>
              </a>
            </>
          )}
        </div>

        {/* Watch progress */}
        {progress > 0 && !completed && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>
                {formatTime(position)} / {formatTime(duration)}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Plot */}
        {plot && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-2">
              Synopsis
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {plot}
            </p>
          </div>
        )}

        {/* Cast & Director */}
        {(cast || director) && (
          <div className="mt-6 flex flex-col gap-3">
            {director && (
              <div className="flex items-start gap-2">
                <Film className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Director
                  </p>
                  <p className="text-xs text-muted-foreground">{director}</p>
                </div>
              </div>
            )}
            {cast && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Cast</p>
                  <p className="text-xs text-muted-foreground">{cast}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
