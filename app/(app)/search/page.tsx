'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '@/lib/db'
import { Virtuoso } from 'react-virtuoso'
import { ImageWithFallback } from '@/components/image-with-fallback'
import { Search, Tv, Film, Clapperboard, X } from 'lucide-react'
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: number
  name: string
  icon: string
  type: 'live' | 'vod' | 'series'
  categoryId: string
  href: string
}

const typeIcons = {
  live: Tv,
  vod: Film,
  series: Clapperboard,
}

const typeLabels = {
  live: 'Live',
  vod: 'Movie',
  series: 'Series',
}

const typeColors = {
  live: 'bg-blue-500/20 text-blue-400',
  vod: 'bg-primary/20 text-primary',
  series: 'bg-amber-500/20 text-amber-400',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const q = searchQuery.toLowerCase()

      const [channels, movies, series] = await Promise.all([
        db.channels
          .filter((ch) => ch.name.toLowerCase().includes(q))
          .limit(50)
          .toArray(),
        db.movies
          .filter((m) => m.name.toLowerCase().includes(q))
          .limit(50)
          .toArray(),
        db.series
          .filter((s) => s.name.toLowerCase().includes(q))
          .limit(50)
          .toArray(),
      ])

      const combined: SearchResult[] = [
        ...channels.map((ch) => ({
          id: ch.streamId,
          name: ch.name,
          icon: ch.streamIcon,
          type: 'live' as const,
          categoryId: ch.categoryId,
          href: `/player?type=live&id=${ch.streamId}`,
        })),
        ...movies.map((m) => ({
          id: m.streamId,
          name: m.name,
          icon: m.streamIcon,
          type: 'vod' as const,
          categoryId: m.categoryId,
          href: `/movies/${m.categoryId}/${m.streamId}`,
        })),
        ...series.map((s) => ({
          id: s.seriesId,
          name: s.name,
          icon: s.cover,
          type: 'series' as const,
          categoryId: s.categoryId,
          href: `/series/${s.categoryId}/${s.seriesId}`,
        })),
      ]

      combined.sort((a, b) => a.name.localeCompare(b.name))
      setResults(combined)
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, performSearch])

  return (
    <div className="px-4 py-6 md:px-8">
      <h1 className="text-xl font-bold text-foreground mb-4">Search</h1>

      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search channels, movies, series..."
          className="h-11 w-full rounded-lg border border-input bg-secondary pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {isSearching && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}

      {!isSearching && query.length >= 2 && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Search className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No results found for &quot;{query}&quot;
          </p>
        </div>
      )}

      {!isSearching && query.length < 2 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Search className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Type at least 2 characters to search
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          <Virtuoso
            useWindowScroll
            totalCount={results.length}
            itemContent={(index) => {
              const item = results[index]
              const Icon = typeIcons[item.type]
              return (
                <div className="mb-2">
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg bg-card border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <ImageWithFallback
                      src={item.icon}
                      alt={item.name}
                      className="h-10 w-10 shrink-0 rounded-md"
                      iconSize={16}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold shrink-0',
                        typeColors[item.type]
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {typeLabels[item.type]}
                    </span>
                  </Link>
                </div>
              )
            }}
          />
        </div>
      )}
    </div>
  )
}
