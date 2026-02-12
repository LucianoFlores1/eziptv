'use client'

import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { COMPLETED_THRESHOLD } from '@/lib/constants'

export function usePlayback() {
  const savePosition = useCallback(
    async (
      contentId: number,
      contentType: 'live' | 'vod' | 'series',
      position: number,
      duration: number
    ) => {
      const existing = await db.playbackState
        .where('[contentId+contentType]')
        .equals([contentId, contentType])
        .first()

      const completed =
        duration > 0 && position / duration >= COMPLETED_THRESHOLD

      if (existing) {
        await db.playbackState.update(existing.id!, {
          position,
          duration,
          watchedAt: Date.now(),
          completed,
        })
      } else {
        await db.playbackState.add({
          contentId,
          contentType,
          position,
          duration,
          watchedAt: Date.now(),
          completed,
        })
      }
    },
    []
  )

  const markCompleted = useCallback(
    async (contentId: number, contentType: 'live' | 'vod' | 'series') => {
      const existing = await db.playbackState
        .where('[contentId+contentType]')
        .equals([contentId, contentType])
        .first()

      if (existing) {
        await db.playbackState.update(existing.id!, {
          completed: true,
          watchedAt: Date.now(),
        })
      }
    },
    []
  )

  const getPosition = useCallback(
    async (
      contentId: number,
      contentType: 'live' | 'vod' | 'series'
    ): Promise<number> => {
      const state = await db.playbackState
        .where('[contentId+contentType]')
        .equals([contentId, contentType])
        .first()
      return state?.position ?? 0
    },
    []
  )

  return { savePosition, markCompleted, getPosition }
}

export function useWatchedStatus(
  contentId: number | undefined,
  contentType: 'live' | 'vod' | 'series'
) {
  const state = useLiveQuery(
    () =>
      contentId != null
        ? db.playbackState
            .where('[contentId+contentType]')
            .equals([contentId, contentType])
            .first()
        : undefined,
    [contentId, contentType]
  )

  return {
    position: state?.position ?? 0,
    duration: state?.duration ?? 0,
    completed: state?.completed ?? false,
    progress:
      state && state.duration > 0
        ? Math.round((state.position / state.duration) * 100)
        : 0,
  }
}

export function useRecentlyWatched(limit = 10) {
  const items = useLiveQuery(
    () =>
      db.playbackState
        .orderBy('watchedAt')
        .reverse()
        .limit(limit)
        .toArray(),
    [limit]
  )
  return items ?? []
}
