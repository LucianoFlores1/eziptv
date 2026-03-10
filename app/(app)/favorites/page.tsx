'use client'

import { useState, useEffect } from 'react'
import { useFavoritesList, useFavorites } from '@/hooks/use-favorites'
import { db } from '@/lib/db'
import { Virtuoso } from 'react-virtuoso'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { Heart, Tv, Film, Clapperboard, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type FilterType = 'all' | 'live' | 'vod' | 'series'

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'vod', label: 'Movies' },
  { key: 'series', label: 'Series' },
]

const typeIcons = {
  live: Tv,
  vod: Film,
  series: Clapperboard,
}

interface FavoriteItem {
  id: number
  contentId: number
  contentType: 'live' | 'vod' | 'series'
  name: string
  icon: string
  href: string
}

export default function FavoritesPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const favorites = useFavoritesList(filter === 'all' ? undefined : filter)
  const { toggleFavorite } = useFavorites()
  const [items, setItems] = useState<FavoriteItem[]>([])

  useEffect(() => {
    async function loadItems() {
      const loaded: FavoriteItem[] = []
      for (const fav of favorites) {
        let name = ''
        let icon = ''
        let href = ''

        if (fav.contentType === 'live') {
          const ch = await db.channels.get(fav.contentId)
          name = ch?.name ?? 'Unknown Channel'
          icon = ch?.streamIcon ?? ''
          href = `/player?type=live&id=${fav.contentId}`
        } else if (fav.contentType === 'vod') {
          const mv = await db.movies.get(fav.contentId)
          name = mv?.name ?? 'Unknown Movie'
          icon = mv?.streamIcon ?? ''
          href = `/movies/detail?category=${encodeURIComponent(mv?.categoryId ?? '')}&id=${fav.contentId}`
        } else {
          const sr = await db.series.get(fav.contentId)
          name = sr?.name ?? 'Unknown Series'
          icon = sr?.cover ?? ''
          href = `/series/detail?category=${encodeURIComponent(sr?.categoryId ?? '')}&id=${fav.contentId}`
        }

        loaded.push({
          id: fav.id!,
          contentId: fav.contentId,
          contentType: fav.contentType,
          name,
          icon,
          href,
        })
      }
      setItems(loaded)
    }
    if (favorites.length > 0) loadItems()
    else setItems([])
  }, [favorites])

  return (
    <div className="px-4 py-6 md:px-8">
      <h1 className="text-xl font-bold text-foreground mb-4">Favorites</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Heart className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No favorites yet. Start adding your favorite content!
          </p>
        </div>
      ) : (
        <Virtuoso
          useWindowScroll
          totalCount={items.length}
          itemContent={(index) => {
            const item = items[index]
            if (!item) return null
            const Icon = typeIcons[item.contentType]
            return (
              <div className="mb-2">
                <div className="flex items-center gap-3 rounded-lg bg-card border border-border p-3 transition-colors hover:bg-accent">
                  <Link href={item.href} className="flex items-center gap-3 flex-1 min-w-0">
                    <ImageWithFallback
                      src={item.icon}
                      alt={item.name}
                      className="h-12 w-12 shrink-0 rounded-md"
                      iconSize={16}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Icon className="h-3 w-3" />
                        {item.contentType === 'live'
                          ? 'Live'
                          : item.contentType === 'vod'
                            ? 'Movie'
                            : 'Series'}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={() =>
                      toggleFavorite(item.contentId, item.contentType)
                    }
                    className="shrink-0 p-2 rounded-md hover:bg-secondary transition-colors"
                    aria-label="Remove from favorites"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            )
          }}
        />
      )}
    </div>
  )
}
