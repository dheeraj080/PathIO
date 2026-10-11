import { useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { SidebarPanel } from '@/components/layout/SidebarPanel'
import { LARGE_SCREEN_MIN_WIDTH_PX } from '@/lib/layout'

interface MobileSidebarDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Slide-in navigation for small screens; auto-closes when resized to desktop. */
export function MobileSidebarDrawer({ open, onOpenChange }: MobileSidebarDrawerProps) {
  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${LARGE_SCREEN_MIN_WIDTH_PX}px)`)
    const handleBreakpointChange = () => {
      if (mediaQuery.matches) onOpenChange(false)
    }
    mediaQuery.addEventListener('change', handleBreakpointChange)
    return () => mediaQuery.removeEventListener('change', handleBreakpointChange)
  }, [onOpenChange])

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} className="p-0">
      <SidebarPanel onNavigate={() => onOpenChange(false)} />
    </Drawer>
  )
}
