import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/auth/useAuth'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

const BASE_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
]

const ADMIN_NAV: NavItem = { name: 'Administration', href: '/admin/users', icon: Shield }

interface SidebarNavProps {
  onNavigate?: () => void
  collapsed?: boolean
}

export function SidebarNav({ onNavigate, collapsed = false }: SidebarNavProps) {
  const { isAdmin } = useAuth()
  const items = isAdmin ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV

  return (
    <div className="flex flex-col gap-8">
      <NavLink
        to="/dashboard"
        onClick={onNavigate}
        title={collapsed ? 'PathIO' : undefined}
        className={cn('flex items-center gap-3', collapsed ? 'justify-center px-0' : 'px-1')}
      >
        <span className="flex aspect-square size-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
          <LayoutDashboard className="size-5" />
        </span>
        {collapsed ? null : (
          <span className="text-lg font-extrabold tracking-tight text-sidebar-foreground">
            PathIO
          </span>
        )}
      </NavLink>

      <nav className="flex flex-col gap-1.5" aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              title={collapsed ? item.name : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-lg py-1.5 transition-colors',
                  'outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/40',
                  collapsed ? 'justify-center px-0' : 'px-4',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary"
                    />
                  ) : null}
                  <Icon className="size-5 shrink-0" />
                  {collapsed ? null : (
                    <span className={cn('text-sm', isActive ? 'font-bold' : 'font-medium')}>
                      {item.name}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}