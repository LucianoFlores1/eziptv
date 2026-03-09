'use client'

import { use } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { usePaginatedContent } from '@/hooks/use-paginated-content'
import { useAuth } from '@/hooks/use-auth'
import { ContentGrid } from '@/components/content-grid'
import { LoadingSpinner } from '@/components/loading-spinner'
import { ArrowLeft, Film } from 'lucide-react'
import Link from 'next/link'

export default function MoviesGridPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = use(params)
  const { credentials } = useAuth()

  const category = useLiveQuery(
    () => db.categories.get(categoryId),
    [categoryId]
  )

  const { items: movies, isLoading, isLoadingMore, error, sentinelRef } = usePaginatedContent({
    credentials,
    categoryId,
    contentType: 'vod',
  })

  const playbackStates = useLiveQuery(
    () => db.playbackState.where('contentType').equals('vod').toArray(),
    []
  )

  if (isLoading) {
    return <LoadingSpinner label="Loading movies..." />
  }

  const playbackMap = new Map(
    (playbackStates ?? []).map((p) => [p.contentId, p])
  )

  const gridItems = movies.map((m) => {
    const pb = playbackMap.get(m.streamId)
    return {
      id: m.streamId,
      title: m.name,
      poster: m.streamIcon,
      rating: m.rating,
      href: `/movies/${categoryId}/${m.streamId}`,
      watchProgress:
        pb && pb.duration > 0
          ? Math.round((pb.position / pb.duration) * 100)
          : undefined,
      completed: pb?.completed,
    }
  })

  return (
    <div className="py-6 md:px-8">
      <div className="flex items-center gap-3 mb-4 px-4 md:px-0">
        <Link
          href="/movies"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors"
          aria-label="Back to categories"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-foreground truncate">
          {category?.name || 'Movies'}
        </h1>
        <span className="ml-auto text-sm text-muted-foreground shrink-0">
          {movies.length} {isLoadingMore ? '...' : ''} movies
        </span>
      </div>

      {error && (
        <div className="mx-4 md:mx-0 mb-4 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}

      {movies.length === 0 && !isLoadingMore ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Film className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No movies in this category.
          </p>
        </div>
      ) : (
        <ContentGrid items={gridItems} sentinelRef={sentinelRef} isLoadingMore={isLoadingMore} />
      )}
    </div>
  )
}
