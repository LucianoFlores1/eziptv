'use client'

import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Favorite } from '@/lib/db'

export function useFavorites() {
  const toggleFavorite = useCallback(
    async (contentId: number, contentType: 'live' | 'vod' | 'series') => {
      const existing = await db.favorites
        .where('[contentId+contentType]')
        .equals([contentId, contentType])
        .first()

      if (existing) {
        await db.favorites.delete(existing.id!)
      } else {
        await db.favorites.add({
          contentId,
          contentType,
          addedAt: Date.now(),
        })
      }
    },
    []
  )

  return { toggleFavorite }
}

export function useIsFavorite(
  contentId: number | undefined,
  contentType: 'live' | 'vod' | 'series'
): boolean {
  const fav = useLiveQuery(
    () =>
      contentId != null
        ? db.favorites
            .where('[contentId+contentType]')
            .equals([contentId, contentType])
            .first()
        : undefined,
    [contentId, contentType]
  )
  return !!fav
}

export function useFavoritesList(contentType?: 'live' | 'vod' | 'series') {
  const favorites = useLiveQuery(
    () => {
      if (contentType) {
        return db.favorites
          .where('contentType')
          .equals(contentType)
          .reverse()
          .sortBy('addedAt')
      }
      return db.favorites.orderBy('addedAt').reverse().toArray()
    },
    [contentType]
  ) as Favorite[] | undefined

  return favorites ?? []
}
