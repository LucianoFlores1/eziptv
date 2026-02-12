'use client'

import { use, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { xtreamApi } from '@/lib/xtream-api'
import { useAuth } from '@/hooks/use-auth'
import { useFavorites, useIsFavorite } from '@/hooks/use-favorites'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { LoadingSpinner } from '@/components/loading-spinner'
import Link from 'next/link'
import {
  ArrowLeft,
  Heart,
  Star,
  Play,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SeriesInfo } from '@/lib/db'

export default function SeriesDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string; seriesId: string }>
}) {
  const { categoryId, seriesId } = use(params)
  const seriesIdNum = parseInt(seriesId, 10)
  const { credentials } = useAuth()
  const { toggleFavorite } = useFavorites()
  const isFav = useIsFavorite(seriesIdNum, 'series')

  const seriesData = useLiveQuery(
    () => db.series.get(seriesIdNum),
    [seriesIdNum]
  )

  const [info, setInfo] = useState<SeriesInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeSeason, setActiveSeason] = useState<string>('1')

  const playbackStates = useLiveQuery(
    () => db.playbackState.where('contentType').equals('series').toArray(),
    []
  )
  const playbackMap = new Map(
    (playbackStates ?? []).map((p) => [p.contentId, p])
  )

  useEffect(() => {
    async function fetchInfo() {
      if (!credentials) return
      try {
        // Check local cache first
        const cached = await db.seriesInfo.get(seriesIdNum)
        if (cached) {
          setInfo(cached)
          const seasons = Object.keys(cached.episodes)
          if (seasons.length > 0) setActiveSeason(seasons[0])
          setIsLoading(false)
          return
        }

        const data = await xtreamApi.getSeriesInfo(credentials, seriesIdNum)
        await db.seriesInfo.put(data)
        setInfo(data)
        const seasons = Object.keys(data.episodes)
        if (seasons.length > 0) setActiveSeason(seasons[0])
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchInfo()
  }, [credentials, seriesIdNum])

  if (isLoading && !seriesData) {
    return <LoadingSpinner label="Loading series details..." />
  }

  const title = seriesData?.name || 'Unknown Series'
  const cover = seriesData?.cover || ''
  const rating = seriesData?.rating || ''
  const plot = seriesData?.plot || ''
  const genre = seriesData?.genre || ''
  const cast = seriesData?.cast || ''

  const seasonKeys = info ? Object.keys(info.episodes).sort((a, b) => Number(a) - Number(b)) : []
  const activeEpisodes = info?.episodes[activeSeason] || []

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="relative">
        <div className="aspect-video w-full max-h-60 overflow-hidden bg-secondary">
          <ImageWithFallback
            src={cover}
            alt={title}
            className="h-full w-full"
            iconSize={48}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <Link
          href={`/series/${categoryId}`}
          className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground hover:bg-background transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <div className="px-4 md:px-8 -mt-10 relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground text-balance">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {rating && rating !== '0' && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  {parseFloat(rating).toFixed(1)}
                </span>
              )}
              {genre && <span>{genre}</span>}
              {seasonKeys.length > 0 && (
                <span>
                  {seasonKeys.length} Season{seasonKeys.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => toggleFavorite(seriesIdNum, 'series')}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors',
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
        </div>

        {/* Plot */}
        {plot && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {plot}
          </p>
        )}

        {/* Cast */}
        {cast && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Cast:</span> {cast}
          </p>
        )}

        {/* Season Tabs */}
        {isLoading ? (
          <LoadingSpinner label="Loading episodes..." className="mt-6" />
        ) : seasonKeys.length > 0 ? (
          <div className="mt-6">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {seasonKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveSeason(key)}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    activeSeason === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  )}
                >
                  Season {key}
                </button>
              ))}
            </div>

            {/* Episode List */}
            <div className="mt-4 flex flex-col gap-2">
              {activeEpisodes.map((ep) => {
                const epId = parseInt(ep.id, 10)
                const pb = playbackMap.get(epId)
                const isCompleted = pb?.completed ?? false
                const epProgress =
                  pb && pb.duration > 0
                    ? Math.round((pb.position / pb.duration) * 100)
                    : 0

                return (
                  <Link
                    key={ep.id}
                    href={`/player?type=series&id=${ep.id}&ext=${ep.containerExtension}`}
                    className="group flex items-center gap-3 rounded-lg bg-card border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isCompleted
                            ? 'text-muted-foreground'
                            : 'text-foreground'
                        )}
                      >
                        E{ep.episodeNum}. {ep.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {ep.info?.duration && <span>{ep.info.duration}</span>}
                        {ep.info?.rating && ep.info.rating !== '0' && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                            {ep.info.rating}
                          </span>
                        )}
                      </div>
                      {epProgress > 0 && !isCompleted && (
                        <div className="mt-1 h-1 rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${epProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              No episodes available.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
