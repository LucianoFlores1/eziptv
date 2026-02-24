'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Tv,
  Film,
  Clapperboard,
  Search,
  Heart,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { type ReactNode } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/live', label: 'Live TV', icon: Tv },
  { href: '/movies', label: 'Movies', icon: Film },
  { href: '/series', label: 'Series', icon: Clapperboard },
  { href: '/search', label: 'Search', icon: Search },
]

const sidebarExtra = [
  { href: '/favorites', label: 'Favorites', icon: Heart },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { disconnect } = useAuth()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Tv className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">
            EzIPTV
          </span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          ))}

          <div className="my-3 h-px bg-sidebar-border" />

          {sidebarExtra.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-sidebar-accent text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4">
          <button
            onClick={disconnect}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Disconnect
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t border-border bg-sidebar/95 backdrop-blur-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors',
                isActive(item.href)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
