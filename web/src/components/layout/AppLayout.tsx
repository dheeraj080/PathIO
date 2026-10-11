import { useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer'
import { cn } from '@/lib/cn'
import { CONTENT_SHELL_CLASS } from '@/lib/layout'

const SCROLL_TOP_THRESHOLD = 10
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'pathio:sidebar-collapsed'

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Authenticated app shell: a persistent sidebar on desktop (collapsible to an
 * icon rail), a slide-in drawer on mobile, a sticky page header, and a
 * scrolling content region that shares its horizontal rhythm with the cards.
 */
export function AppLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsed)
  const [isScrolled, setIsScrolled] = useState(false)
  const lastScrollY = useRef(0)

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((value) => {
      const next = !value
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // Storage may be unavailable (private mode); the preference just won't persist.
      }
      return next
    })
  }

  const handleScroll = (event: React.UIEvent<HTMLElement>) => {
    const currentScrollY = event.currentTarget.scrollTop
    setIsScrolled(currentScrollY > SCROLL_TOP_THRESHOLD)
    lastScrollY.current = currentScrollY
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-sidebar text-foreground">
      <Sidebar collapsed={isSidebarCollapsed} onToggleCollapse={handleToggleSidebar} />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'z-20 shrink-0 border-b bg-sidebar transition-colors duration-200',
            isScrolled ? 'border-sidebar-border' : 'border-transparent',
          )}
        >
          <div className={CONTENT_SHELL_CLASS}>
            <DashboardHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
          </div>
        </div>

        <main
          className="min-h-0 flex-1 overflow-y-auto bg-sidebar [scrollbar-gutter:stable]"
          onScroll={handleScroll}
        >
          <div className={cn(CONTENT_SHELL_CLASS, 'pb-8 pt-2 md:pb-10 md:pt-6')}>
            <Outlet />
          </div>
        </main>
      </div>

      <MobileSidebarDrawer open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen} />
    </div>
  )
}