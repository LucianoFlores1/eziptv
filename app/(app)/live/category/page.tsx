'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Virtuoso } from 'react-virtuoso'
import { usePaginatedContent } from '@/hooks/use-paginated-content'
import { useAuth } from '@/hooks/use-auth'
import { ChannelRow } from '@/components/channel-row'
import { LoadingSpinner } from '@/components/loading-spinner'
import { ArrowLeft, Tv } from 'lucide-react'
import Link from 'next/link'

export default function LiveChannelsPage() {
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('category') ?? ''
  const { credentials } = useAuth()
  const localSentinelRef = useRef<HTMLDivElement | null>(null)

  const category = useLiveQuery(
    () => (categoryId ? db.categories.get(categoryId) : undefined),
    [categoryId]
  )

  const { items: channels, isLoading, isLoadingMore, error, sentinelRef } = usePaginatedContent({
    credentials,
    categoryId,
    contentType: 'live',
  })

  const setSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      localSentinelRef.current = node
      if (sentinelRef) {
        sentinelRef.current = node
      }
    },
    [sentinelRef]
  )

  useEffect(() => {
    if (localSentinelRef.current) {
      localSentinelRef.current.style.opacity = '0'
      localSentinelRef.current.offsetHeight
      localSentinelRef.current.style.opacity = ''
    }
  }, [channels.length])

  if (!categoryId) {
    return (
      <div className="px-4 py-6 md:px-8">
        <p className="text-sm text-muted-foreground">Missing category id.</p>
      </div>
    )
  }

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
          <div
            ref={setSentinelRef}
            className="h-20 w-full flex items-center justify-center"
            aria-hidden="true"
          >
            {isLoadingMore && (
              <div className="text-sm text-muted-foreground">Loading more...</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
