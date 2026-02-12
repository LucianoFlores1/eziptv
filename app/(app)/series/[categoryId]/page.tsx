'use client'

import { use } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { ContentGrid } from '@/components/content-grid'
import { LoadingSpinner } from '@/components/loading-spinner'
import { ArrowLeft, Clapperboard } from 'lucide-react'
import Link from 'next/link'

export default function SeriesGridPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = use(params)

  const category = useLiveQuery(
    () => db.categories.get(categoryId),
    [categoryId]
  )

  const series = useLiveQuery(
    () =>
      db.series
        .where('categoryId')
        .equals(categoryId)
        .sortBy('name'),
    [categoryId]
  )

  if (!series) {
    return <LoadingSpinner label="Loading series..." />
  }

  const gridItems = series.map((s) => ({
    id: s.seriesId,
    title: s.name,
    poster: s.cover,
    rating: s.rating,
    href: `/series/${categoryId}/${s.seriesId}`,
  }))

  return (
    <div className="py-6 md:px-8">
      <div className="flex items-center gap-3 mb-4 px-4 md:px-0">
        <Link
          href="/series"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors"
          aria-label="Back to categories"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-foreground truncate">
          {category?.name || 'Series'}
        </h1>
        <span className="ml-auto text-sm text-muted-foreground shrink-0">
          {series.length} series
        </span>
      </div>

      {series.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Clapperboard className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No series in this category.
          </p>
        </div>
      ) : (
        <ContentGrid items={gridItems} />
      )}
    </div>
  )
}
