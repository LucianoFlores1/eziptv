'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Virtuoso } from 'react-virtuoso'
import { CategoryRow } from '@/components/content-card'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Film } from 'lucide-react'

export default function MoviesCategoriesPage() {
  const categories = useLiveQuery(
    () => db.categories.where('type').equals('vod').sortBy('name'),
    []
  )

  const movieCounts = useLiveQuery(async () => {
    const counts: Record<string, number> = {}
    const movies = await db.movies.toArray()
    for (const m of movies) {
      counts[m.categoryId] = (counts[m.categoryId] || 0) + 1
    }
    return counts
  }, [])

  if (!categories) {
    return <LoadingSpinner label="Loading categories..." />
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <Film className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No movie categories found. Try syncing your content.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <h1 className="text-xl font-bold text-foreground mb-4">Movies</h1>
      <Virtuoso
        useWindowScroll
        totalCount={categories.length}
        itemContent={(index) => {
          const cat = categories[index]
          return (
            <div className="mb-2">
              <CategoryRow
                name={cat.name}
                count={movieCounts?.[cat.id]}
                href={`/movies/category?category=${encodeURIComponent(cat.id)}`}
              />
            </div>
          )
        }}
      />
    </div>
  )
}
