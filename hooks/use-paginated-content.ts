'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { xtreamApi, XtreamCredentials } from '@/lib/xtream-api'
import { db } from '@/lib/db'

interface UsePaginatedContentOptions {
  credentials: XtreamCredentials | null
  categoryId: string
  contentType: 'live' | 'vod' | 'series'
  pageSize?: number
}

/**
 * Hook for infinite scroll pagination
 * - Loads initial items from Dexie database
 * - Uses IntersectionObserver to detect when user scrolls near bottom
 * - Fetches next page from Xtream API and stores in Dexie
 * - Returns current items list and loading state
 */
export function usePaginatedContent({
  credentials,
  categoryId,
  contentType,
  pageSize = 48,
}: UsePaginatedContentOptions) {
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentOffsetRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isFetchingRef = useRef(false)

  // Load initial items from Dexie
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setIsLoading(true)
        let dbItems: any[] = []

        if (contentType === 'live') {
          dbItems = await db.channels
            .where('categoryId')
            .equals(categoryId)
            .toArray()
        } else if (contentType === 'vod') {
          dbItems = await db.movies
            .where('categoryId')
            .equals(categoryId)
            .toArray()
        } else if (contentType === 'series') {
          dbItems = await db.series
            .where('categoryId')
            .equals(categoryId)
            .toArray()
        }

        setItems(dbItems)
        setError(null)
      } catch (err) {
        console.error('[usePaginatedContent] Error loading initial items:', err)
        setError('Failed to load items')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitial()
  }, [categoryId, contentType])

  // Fetch next page from API
  const fetchNextPage = useCallback(async () => {
    if (!credentials || isFetchingRef.current || !hasMore) return

    isFetchingRef.current = true
    setIsLoadingMore(true)

    try {
      let newItems: any[] = []
      const offset = currentOffsetRef.current
      const limit = pageSize

      if (contentType === 'live') {
        newItems = await xtreamApi.getLiveStreams(credentials, categoryId)
      } else if (contentType === 'vod') {
        newItems = await xtreamApi.getVodStreams(credentials, categoryId)
      } else if (contentType === 'series') {
        newItems = await xtreamApi.getSeries(credentials, categoryId)
      }

      // Apply offset and limit
      const paginatedItems = newItems.slice(offset, offset + limit)

      if (paginatedItems.length === 0) {
        setHasMore(false)
        isFetchingRef.current = false
        setIsLoadingMore(false)
        return
      }

      // Store new items in Dexie
      try {
        if (contentType === 'live') {
          await db.channels.bulkPut(paginatedItems as any[])
        } else if (contentType === 'vod') {
          await db.movies.bulkPut(paginatedItems as any[])
        } else if (contentType === 'series') {
          await db.series.bulkPut(paginatedItems as any[])
        }
      } catch (dbErr) {
        console.error('[usePaginatedContent] Error storing items:', dbErr)
      }

      // Update local state
      setItems((prev) => {
        const existingIds = new Set(
          contentType === 'series'
            ? prev.map((p: any) => p.seriesId)
            : prev.map((p: any) => p.streamId)
        )
        const filtered = paginatedItems.filter((item: any) => {
          const id = contentType === 'series' ? item.seriesId : item.streamId
          return !existingIds.has(id)
        })
        return [...prev, ...filtered]
      })

      currentOffsetRef.current += limit
      setHasMore(paginatedItems.length === limit)
      setError(null)
    } catch (err) {
      console.error('[usePaginatedContent] Error fetching next page:', err)
      setError('Failed to load more items')
    } finally {
      isFetchingRef.current = false
      setIsLoadingMore(false)
    }
  }, [credentials, categoryId, contentType, pageSize, hasMore])

  // Setup IntersectionObserver to detect when user scrolls to bottom
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !error) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' } // Start loading 200px before reaching bottom
    )

    observer.observe(sentinel)
    observerRef.current = observer

    return () => {
      observer.disconnect()
    }
  }, [fetchNextPage, hasMore, isLoadingMore, error])

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sentinelRef,
  }
}
