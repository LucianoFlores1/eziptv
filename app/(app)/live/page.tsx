'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Virtuoso } from 'react-virtuoso'
import { CategoryRow } from '@/components/content-card'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Tv } from 'lucide-react'

export default function LiveCategoriesPage() {
  const categories = useLiveQuery(
    () => db.categories.where('type').equals('live').sortBy('name'),
    []
  )

  const channelCounts = useLiveQuery(async () => {
    const counts: Record<string, number> = {}
    const channels = await db.channels.toArray()
    for (const ch of channels) {
      counts[ch.categoryId] = (counts[ch.categoryId] || 0) + 1
    }
    return counts
  }, [])

  if (!categories) {
    return <LoadingSpinner label="Loading categories..." />
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Tv className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No live categories found. Try syncing your content.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <h1 className="text-xl font-bold text-foreground mb-4">Live TV</h1>
      <Virtuoso
        useWindowScroll
        totalCount={categories.length}
        itemContent={(index) => {
          const cat = categories[index]
          return (
            <div className="mb-2">
              <CategoryRow
                name={cat.name}
                count={channelCounts?.[cat.id]}
                href={`/live/category?category=${encodeURIComponent(cat.id)}`}
              />
            </div>
          )
        }}
      />
    </div>
  )
}
