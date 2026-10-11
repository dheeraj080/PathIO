import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Brand } from '@/components/Brand'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { CONTENT_SHELL_CLASS } from '@/lib/layout'
import { cn } from '@/lib/cn'

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#use-cases', label: 'Use cases' },
  { href: '#faq', label: 'FAQ' },
]

const navLinkClass =
  'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'

/** Public marketing chrome: responsive header + footer around the landing page. */
export function MarketingLayout() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Close the mobile menu on Escape (returning focus) or an outside click.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !toggleRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  return (
    <div className="flex min-h-screen flex-col bg-sidebar text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-soft"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-sidebar/90 backdrop-blur">
        <div className={cn(CONTENT_SHELL_CLASS, 'flex h-16 items-center justify-between gap-4')}>
          <Brand />

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className={navLinkClass}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/signup" className="hidden sm:block">
              <Button size="sm">Start shortening</Button>
            </Link>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-md p-2 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 md:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="marketing-mobile-menu"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        <div
          id="marketing-mobile-menu"
          ref={menuRef}
          hidden={!open}
          className="border-t border-border bg-sidebar px-4 py-4 md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} className={navLinkClass}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <Link to="/login" onClick={() => setOpen(false)}>
              <Button variant="secondary" size="sm" className="w-full justify-center">
                Sign in
              </Button>
            </Link>
            <Link to="/signup" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full justify-center">
                Start shortening
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-sidebar">
        <div className={cn(CONTENT_SHELL_CLASS, 'grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4')}>
          <div className="sm:col-span-2">
            <Brand />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              A URL shortener with built-in click analytics. Create short links, choose custom
              aliases, and see how each link performs.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">Product</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="rounded text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">Account</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  to="/signup"
                  className="rounded text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none"
                >
                  Create account
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="rounded text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="rounded text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border">
          <div className={cn(CONTENT_SHELL_CLASS, 'py-6 text-xs text-muted-foreground')}>
            PathIO — URL shortener with built-in click analytics.
          </div>
        </div>
      </footer>
    </div>
  )
}
