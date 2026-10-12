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

/**
 * Text-first navigation rail. The wordmark is a plain Fraunces line (no filled
 * logo tile), a single hairline separates it from the nav, and the active item
 * is the only place the accent appears.
 */
export function SidebarNav({ onNavigate, collapsed = false }: SidebarNavProps) {
  const { isAdmin } = useAuth()
  const items = isAdmin ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV

  return (
    <div className="flex flex-col">
      <NavLink
        to="/dashboard"
        onClick={onNavigate}
        title="PathIO"
        aria-label="PathIO dashboard"
        className={cn(
          'inline-flex items-baseline gap-2 text-foreground',
          'outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/40',
          collapsed ? 'justify-center' : 'px-2',
        )}
      >
        <span className="font-display text-xl font-medium leading-none tracking-[-0.02em]">
          {collapsed ? (
            <>
              P<span className="text-primary">/</span>
            </>
          ) : (
            <>
              Path<span className="text-primary">/IO</span>
            </>
          )}
        </span>
      </NavLink>

      <nav
        aria-label="Primary"
        className="mt-6 flex flex-col gap-0.5 border-t border-sidebar-border pt-4"
      >
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
                  'group flex items-center gap-3 border-l-2 py-2 text-sm transition-colors',
                  'outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/40',
                  collapsed ? 'justify-center px-0' : 'px-2',
                  isActive
                    ? 'border-primary font-medium text-primary'
                    : 'border-transparent text-muted-foreground hover:text-sidebar-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
                  {collapsed ? null : <span>{item.name}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
