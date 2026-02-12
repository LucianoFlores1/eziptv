'use client'

import { useState, useCallback } from 'react'
import { db } from '@/lib/db'
import { xtreamApi, type XtreamCredentials } from '@/lib/xtream-api'
import { SYNC_STALE_TIME } from '@/lib/constants'

interface SyncProgress {
  current: number
  total: number
  label: string
}

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [progress, setProgress] = useState<SyncProgress>({
    current: 0,
    total: 6,
    label: '',
  })

  const shouldSync = useCallback(async (): Promise<boolean> => {
    try {
      const meta = await db.syncMeta.get('lastSync')
      if (!meta) return true
      return Date.now() - meta.updatedAt > SYNC_STALE_TIME
    } catch {
      return true
    }
  }, [])

  const syncAllContent = useCallback(
    async (credentials: XtreamCredentials) => {
      setIsSyncing(true)
      const total = 6

      try {
        // Step 1: Live categories
        setProgress({ current: 1, total, label: 'Syncing live categories...' })
        const liveCats = await xtreamApi.getLiveCategories(credentials)
        await db.categories.bulkPut(liveCats)

        // Step 2: VOD categories
        setProgress({ current: 2, total, label: 'Syncing movie categories...' })
        const vodCats = await xtreamApi.getVodCategories(credentials)
        await db.categories.bulkPut(vodCats)

        // Step 3: Series categories
        setProgress({ current: 3, total, label: 'Syncing series categories...' })
        const seriesCats = await xtreamApi.getSeriesCategories(credentials)
        await db.categories.bulkPut(seriesCats)

        // Step 4: Live streams
        setProgress({ current: 4, total, label: 'Syncing live channels...' })
        const channels = await xtreamApi.getLiveStreams(credentials)
        await db.channels.bulkPut(channels)

        // Step 5: VOD streams
        setProgress({ current: 5, total, label: 'Syncing movies...' })
        const movies = await xtreamApi.getVodStreams(credentials)
        await db.movies.bulkPut(movies)

        // Step 6: Series
        setProgress({ current: 6, total, label: 'Syncing series...' })
        const series = await xtreamApi.getSeries(credentials)
        await db.series.bulkPut(series)

        // Mark sync complete
        await db.syncMeta.put({
          key: 'lastSync',
          value: new Date().toISOString(),
          updatedAt: Date.now(),
        })

        setProgress({ current: total, total, label: 'Sync complete!' })
      } catch (error) {
        setProgress({ current: 0, total, label: 'Sync failed' })
        throw error
      } finally {
        setIsSyncing(false)
      }
    },
    []
  )

  return { isSyncing, progress, syncAllContent, shouldSync }
}
