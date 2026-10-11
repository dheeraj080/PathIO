import { SidebarPanel } from '@/components/layout/SidebarPanel'
import { cn } from '@/lib/cn'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

/** Persistent desktop navigation rail (hidden below `lg`); collapsible to an icon rail. */
export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r-[0.5px] border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-60',
      )}
    >
      <SidebarPanel collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </aside>
  )
}