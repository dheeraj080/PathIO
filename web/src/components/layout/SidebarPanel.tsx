import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { SidebarUserMenu } from '@/components/layout/SidebarUserMenu'
import { cn } from '@/lib/cn'

interface SidebarPanelProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}

/**
 * Shared sidebar body, rendered both in the desktop rail and the mobile drawer.
 * The collapse toggle is only shown on desktop (no toggle handler in the drawer).
 */
export function SidebarPanel({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: SidebarPanelProps) {
  return (
    <div className={cn('flex h-full flex-col justify-between', collapsed ? 'p-2' : 'p-5')}>
      <SidebarNav onNavigate={onNavigate} collapsed={collapsed} />

      <div className="flex flex-col gap-1 border-t border-sidebar-border pt-4">
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex items-center gap-3 rounded-sm text-muted-foreground transition-colors hover:text-sidebar-foreground',
              'outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/40',
              collapsed ? 'justify-center py-2' : 'px-2 py-2 text-sm font-medium',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="size-5 shrink-0" />
                Collapse
              </>
            )}
          </button>
        ) : null}

        <SidebarUserMenu onNavigate={onNavigate} collapsed={collapsed} />
      </div>
    </div>
  )
}