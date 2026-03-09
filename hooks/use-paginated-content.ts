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
 * - Auto-fetches if viewport isn't filled on initial load
 * - Returns current items list and loading state
 */
export function usePaginatedContent({
  credentials,
  categoryId,
  contentType,
  pageSize = 60, // Increased from 48 to ensure viewport is filled
}: UsePaginatedContentOptions) {
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const currentOffsetRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isFetchingRef = useRef(false)

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

  // Load initial items from Dexie
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setIsLoading(true)
        setInitialLoadDone(false)
        currentOffsetRef.current = 0
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
        currentOffsetRef.current = dbItems.length
        setError(null)
      } catch (err) {
        console.error('[usePaginatedContent] Error loading initial items:', err)
        setError('Failed to load items')
      } finally {
        setIsLoading(false)
        setInitialLoadDone(true)
      }
    }

    loadInitial()
  }, [categoryId, contentType])

  // Auto-fetch if viewport isn't filled after initial load
  useEffect(() => {
    if (!initialLoadDone || isLoading || !hasMore || !credentials) return

    // Check if we need to fetch more to fill the viewport
    const checkAndFetchMore = () => {
      const sentinel = sentinelRef.current
      if (!sentinel) return

      const rect = sentinel.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      
      // If the sentinel is visible in the viewport (meaning content doesn't fill the screen)
      // or if we have very few items, trigger a fetch
      if (rect.top < viewportHeight + 400 || items.length < 20) {
        fetchNextPage()
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(checkAndFetchMore, 100)
    return () => clearTimeout(timer)
  }, [initialLoadDone, isLoading, hasMore, credentials, items.length, fetchNextPage])

  // Setup IntersectionObserver to detect when user scrolls to bottom
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !initialLoadDone) return

    // Disconnect any existing observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting && hasMore && !isLoadingMore && !error) {
          fetchNextPage()
        }
      },
      { 
        rootMargin: '400px', // Increased from 200px - start loading earlier
        threshold: 0 
      }
    )

    observer.observe(sentinel)
    observerRef.current = observer

    return () => {
      observer.disconnect()
    }
  }, [fetchNextPage, hasMore, isLoadingMore, error, initialLoadDone])

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sentinelRef,
  }
}
