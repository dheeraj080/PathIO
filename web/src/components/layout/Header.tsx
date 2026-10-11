import { NavLink, Link } from 'react-router-dom'
import { StatusBadge } from '@/components/StatusBadge'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Brand } from '@/components/Brand'
import { Button } from '@/components/ui/Button'
import { UserMenu } from '@/components/layout/UserMenu'
import { useAuth } from '@/auth/useAuth'
import { cn } from '@/lib/cn'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  )

export function Header() {
  const { isAuthenticated, isAdmin } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Brand />
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            {isAdmin ? (
              <NavLink to="/admin/users" className={navLinkClass}>
                Admin
              </NavLink>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <StatusBadge />
          </div>
          <ThemeToggle />
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/signup" className="hidden sm:block">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
