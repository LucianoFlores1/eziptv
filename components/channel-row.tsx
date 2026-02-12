'use client'

import Link from 'next/link'
import { ImageWithFallback } from './image-with-fallback'
import { Heart } from 'lucide-react'
import { useFavorites, useIsFavorite } from '@/hooks/use-favorites'
import { cn } from '@/lib/utils'

interface ChannelRowProps {
  streamId: number
  name: string
  icon?: string
  num?: number
}

export function ChannelRow({ streamId, name, icon, num }: ChannelRowProps) {
  const { toggleFavorite } = useFavorites()
  const isFav = useIsFavorite(streamId, 'live')

  return (
    <div className="flex items-center gap-3 rounded-lg bg-card border border-border px-3 py-2.5 transition-colors hover:bg-accent">
      <ImageWithFallback
        src={icon}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-md"
        iconSize={16}
      />
      <Link
        href={`/player?type=live&id=${streamId}`}
        className="flex-1 min-w-0"
      >
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        {num != null && num > 0 && (
          <p className="text-xs text-muted-foreground">Ch. {num}</p>
        )}
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault()
          toggleFavorite(streamId, 'live')
        }}
        className="shrink-0 p-1.5 rounded-md hover:bg-secondary transition-colors"
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          className={cn(
            'h-4 w-4 transition-colors',
            isFav ? 'fill-primary text-primary' : 'text-muted-foreground'
          )}
        />
      </button>
    </div>
  )
}
