'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Virtuoso } from 'react-virtuoso'
import { CategoryRow } from '@/components/content-card'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Clapperboard } from 'lucide-react'

export default function SeriesCategoriesPage() {
  const categories = useLiveQuery(
    () => db.categories.where('type').equals('series').sortBy('name'),
    []
  )

  const seriesCounts = useLiveQuery(async () => {
    const counts: Record<string, number> = {}
    const series = await db.series.toArray()
    for (const s of series) {
      counts[s.categoryId] = (counts[s.categoryId] || 0) + 1
    }
    return counts
  }, [])

  if (!categories) {
    return <LoadingSpinner label="Loading categories..." />
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Clapperboard className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No series categories found. Try syncing your content.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <h1 className="text-xl font-bold text-foreground mb-4">Series</h1>
      <Virtuoso
        useWindowScroll
        totalCount={categories.length}
        itemContent={(index) => {
          const cat = categories[index]
          return (
            <div className="mb-2">
              <CategoryRow
                name={cat.name}
                count={seriesCounts?.[cat.id]}
                href={`/series/${cat.id}`}
              />
            </div>
          )
        }}
      />
    </div>
  )
}
