import { NavLink, Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Brand } from '@/components/Brand'
import { Button } from '@/components/ui/Button'
import { UserMenu } from '@/components/layout/UserMenu'
import { useAuth } from '@/auth/useAuth'
import { cn } from '@/lib/cn'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-accent text-accent-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  )

export function Header() {
  const { isAuthenticated, isAdmin } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
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
