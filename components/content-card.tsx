'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ImageWithFallback } from './image-with-fallback'
import { Star, CheckCircle } from 'lucide-react'

interface ContentCardProps {
  href: string
  title: string
  poster?: string
  rating?: string
  watchProgress?: number
  completed?: boolean
}

export function ContentCard({
  href,
  title,
  poster,
  rating,
  watchProgress,
  completed,
}: ContentCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden rounded-lg">
        <ImageWithFallback
          src={poster}
          alt={title}
          className="aspect-[2/3] w-full rounded-lg"
          iconSize={32}
        />

        {/* Rating badge */}
        {rating && rating !== '' && rating !== '0' && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded bg-background/80 px-1.5 py-0.5">
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            <span className="text-[10px] font-semibold text-foreground">
              {parseFloat(rating).toFixed(1)}
            </span>
          </div>
        )}

        {/* Completed overlay */}
        {completed && (
          <div className="absolute top-1.5 left-1.5">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        )}

        {/* Watch progress bar */}
        {watchProgress != null && watchProgress > 0 && !completed && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(watchProgress, 100)}%` }}
            />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
      </div>
      <p className="mt-1.5 text-xs font-medium text-foreground truncate leading-relaxed">
        {title}
      </p>
    </Link>
  )
}

interface CategoryRowProps {
  name: string
  count?: number
  href: string
}

export function CategoryRow({ name, count, href }: CategoryRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg bg-card border border-border px-4 py-3.5 transition-colors hover:bg-accent"
    >
      <span className="text-sm font-medium text-foreground">{name}</span>
      {count != null && (
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      )}
    </Link>
  )
}
