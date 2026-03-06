'use client'

import { forwardRef, useCallback, useEffect, useRef } from 'react'
import { VirtuosoGrid } from 'react-virtuoso'
import { ContentCard } from './content-card'

interface GridItem {
  id: number
  title: string
  poster?: string
  rating?: string
  href: string
  watchProgress?: number
  completed?: boolean
}

interface ContentGridProps {
  items: GridItem[]
  sentinelRef?: React.MutableRefObject<HTMLDivElement | null>
  isLoadingMore?: boolean
}

const gridComponents = {
  List: forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function ListComponent({ style, children, ...props }, ref) {
      return (
        <div
          ref={ref}
          {...props}
          style={style}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 px-4 md:px-0"
        >
          {children}
        </div>
      )
    }
  ),
  Item: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}

export function ContentGrid({ items, sentinelRef, isLoadingMore }: ContentGridProps) {
  const localSentinelRef = useRef<HTMLDivElement | null>(null)

  // Callback ref to sync with parent's sentinelRef
  const setSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      localSentinelRef.current = node
      if (sentinelRef) {
        sentinelRef.current = node
      }
    },
    [sentinelRef]
  )

  // Re-trigger observer check when items change
  useEffect(() => {
    if (localSentinelRef.current) {
      // Force a reflow to ensure IntersectionObserver picks up changes
      localSentinelRef.current.style.opacity = '0'
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      localSentinelRef.current.offsetHeight // trigger reflow
      localSentinelRef.current.style.opacity = ''
    }
  }, [items.length])

  return (
    <>
      <VirtuosoGrid
        totalCount={items.length}
        useWindowScroll
        overscan={200}
        components={gridComponents}
        itemContent={(index) => {
          const item = items[index]
          if (!item) return null
          return (
            <ContentCard
              href={item.href}
              title={item.title}
              poster={item.poster}
              rating={item.rating}
              watchProgress={item.watchProgress}
              completed={item.completed}
            />
          )
        }}
      />
      {/* Sentinel for infinite scroll detection - always render */}
      <div 
        ref={setSentinelRef} 
        className="h-20 w-full flex items-center justify-center" 
        aria-hidden="true"
      >
        {isLoadingMore && (
          <div className="text-sm text-muted-foreground">Loading more...</div>
        )}
      </div>
    </>
  )
}
