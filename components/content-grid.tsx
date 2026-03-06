'use client'

import { forwardRef } from 'react'
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
  sentinelRef?: React.RefObject<HTMLDivElement>
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

export function ContentGrid({ items, sentinelRef }: ContentGridProps) {
  return (
    <>
      <VirtuosoGrid
        totalCount={items.length}
        useWindowScroll
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
      {/* Sentinel for infinite scroll detection */}
      {sentinelRef && (
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      )}
    </>
  )
}
