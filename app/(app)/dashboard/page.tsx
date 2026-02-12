'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useSync } from '@/hooks/use-sync'
import { useRecentlyWatched } from '@/hooks/use-playback'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { toast } from 'sonner'
import {
  Tv,
  Film,
  Clapperboard,
  RefreshCw,
  LogOut,
  ChevronRight,
  Play,
} from 'lucide-react'
import { ImageWithFallback } from '@/components/image-with-fallback'

export default function DashboardPage() {
  const { credentials, userInfo, disconnect } = useAuth()
  const { isSyncing, progress, syncAllContent, shouldSync } = useSync()
  const recentlyWatched = useRecentlyWatched(10)
  const router = useRouter()
  const [hasInitialSync, setHasInitialSync] = useState(false)

  const channelCount = useLiveQuery(() => db.channels.count()) ?? 0
  const movieCount = useLiveQuery(() => db.movies.count()) ?? 0
  const seriesCount = useLiveQuery(() => db.series.count()) ?? 0

  // Lookup content info for recently watched items
  const [recentContent, setRecentContent] = useState<
    Array<{
      contentId: number
      contentType: string
      name: string
      icon: string
      position: number
      duration: number
    }>
  >([])

  useEffect(() => {
    async function loadRecent() {
      const items = []
      for (const rw of recentlyWatched) {
        let name = ''
        let icon = ''
        if (rw.contentType === 'live') {
          const ch = await db.channels.get(rw.contentId)
          name = ch?.name ?? 'Unknown Channel'
          icon = ch?.streamIcon ?? ''
        } else if (rw.contentType === 'vod') {
          const mv = await db.movies.get(rw.contentId)
          name = mv?.name ?? 'Unknown Movie'
          icon = mv?.streamIcon ?? ''
        } else {
          const sr = await db.series.get(rw.contentId)
          name = sr?.name ?? 'Unknown Series'
          icon = sr?.cover ?? ''
        }
        items.push({
          contentId: rw.contentId,
          contentType: rw.contentType,
          name,
          icon,
          position: rw.position,
          duration: rw.duration,
        })
      }
      setRecentContent(items)
    }
    if (recentlyWatched.length > 0) loadRecent()
    else setRecentContent([])
  }, [recentlyWatched])

  useEffect(() => {
    async function runInitialSync() {
      if (!credentials || hasInitialSync) return
      setHasInitialSync(true)
      const needsSync = await shouldSync()
      if (needsSync) {
        try {
          await syncAllContent(credentials)
          toast.success('Content synced successfully')
        } catch {
          toast.error('Failed to sync content')
        }
      }
    }
    runInitialSync()
  }, [credentials, hasInitialSync, shouldSync, syncAllContent])

  const handleSync = async () => {
    if (!credentials || isSyncing) return
    try {
      await syncAllContent(credentials)
      toast.success('Content synced successfully')
    } catch {
      toast.error('Failed to sync content')
    }
  }

  const handleDisconnect = () => {
    disconnect()
    router.replace('/login')
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const contentCards = [
    {
      href: '/live',
      icon: Tv,
      label: 'Live TV',
      count: channelCount,
      countLabel: 'channels',
    },
    {
      href: '/movies',
      icon: Film,
      label: 'Movies',
      count: movieCount,
      countLabel: 'movies',
    },
    {
      href: '/series',
      icon: Clapperboard,
      label: 'Series',
      count: seriesCount,
      countLabel: 'series',
    },
  ]

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Welcome back
            {userInfo?.username ? `, ${userInfo.username}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {userInfo?.status === 'Active' ? 'Account active' : 'Connected'}
            {userInfo?.expDate && userInfo.expDate !== ''
              ? ` - Expires ${new Date(
                  Number(userInfo.expDate) * 1000
                ).toLocaleDateString()}`
              : ''}
          </p>
        </div>
      </div>

      {/* Sync Progress */}
      {isSyncing && (
        <div className="mb-6 rounded-lg bg-card border border-border p-4">
          <p className="text-sm text-foreground mb-2">{progress.label}</p>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {progress.current} / {progress.total}
          </p>
        </div>
      )}

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-8">
        {contentCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-center gap-4 rounded-xl bg-card border border-border p-4 transition-colors hover:bg-accent"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <card.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">
                {card.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {card.count.toLocaleString()} {card.countLabel}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        ))}
      </div>

      {/* Recently Watched */}
      {recentContent.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Continue Watching
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {recentContent.map((item) => (
              <Link
                key={`${item.contentType}-${item.contentId}`}
                href={`/player?type=${item.contentType}&id=${item.contentId}`}
                className="group relative flex-shrink-0 w-36"
              >
                <div className="relative">
                  <ImageWithFallback
                    src={item.icon}
                    alt={item.name}
                    className="h-20 w-36 rounded-lg"
                    iconSize={20}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <Play className="h-8 w-8 text-primary-foreground" />
                  </div>
                  {item.duration > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg bg-secondary">
                      <div
                        className="h-full rounded-b-lg bg-primary"
                        style={{
                          width: `${Math.min(
                            (item.position / item.duration) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-xs font-medium text-foreground truncate">
                  {item.name}
                </p>
                {item.position > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatTime(item.position)}
                    {item.duration > 0 &&
                      ` / ${formatTime(item.duration)}`}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
          />
          {isSyncing ? 'Syncing...' : 'Update Content'}
        </button>
        <button
          onClick={handleDisconnect}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-medium text-destructive transition-opacity hover:opacity-80 md:hidden"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </button>
      </div>
    </div>
  )
}
