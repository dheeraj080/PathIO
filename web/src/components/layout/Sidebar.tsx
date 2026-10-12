import { SidebarPanel } from '@/components/layout/SidebarPanel'
import { cn } from '@/lib/cn'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

/** Quiet desktop navigation rail (hidden below `lg`); collapses to a slim rail. */
export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out lg:flex',
        collapsed ? 'w-[3.5rem]' : 'w-56',
      )}
    >
      <SidebarPanel collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </aside>
  )
}
