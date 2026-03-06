'use client'

import { use } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Virtuoso } from 'react-virtuoso'
import { usePaginatedContent } from '@/hooks/use-paginated-content'
import { useCredentials } from '@/hooks/use-credentials'
import { ChannelRow } from '@/components/channel-row'
import { LoadingSpinner } from '@/components/loading-spinner'
import { ArrowLeft, Tv } from 'lucide-react'
import Link from 'next/link'
import { useRef } from 'react'

export default function LiveChannelsPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = use(params)
  const credentials = useCredentials()
  const sentinelRef = useRef<HTMLDivElement>(null)

  const category = useLiveQuery(
    () => db.categories.get(categoryId),
    [categoryId]
  )

  const { items: channels, isLoading, isLoadingMore, error } = usePaginatedContent({
    credentials,
    categoryId,
    contentType: 'live',
  })

  if (isLoading) {
    return <LoadingSpinner label="Loading channels..." />
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/live"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors"
          aria-label="Back to categories"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-foreground truncate">
          {category?.name || 'Channels'}
        </h1>
        <span className="ml-auto text-sm text-muted-foreground shrink-0">
          {channels.length} {isLoadingMore ? '...' : ''} channels
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}

      {channels.length === 0 && !isLoadingMore ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Tv className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No channels in this category.
          </p>
        </div>
      ) : (
        <>
          <Virtuoso
            useWindowScroll
            totalCount={channels.length}
            itemContent={(index) => {
              const ch = channels[index]
              return (
                <div className="mb-2">
                  <ChannelRow
                    streamId={ch.streamId}
                    name={ch.name}
                    icon={ch.streamIcon}
                    num={ch.num}
                  />
                </div>
              )
            }}
          />
          {/* Sentinel for infinite scroll detection */}
          <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
        </>
      )}
    </div>
  )
}
