import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LandingButton } from '@/routes/landing/LandingButton'
import { LandingMark } from '@/routes/landing/LandingMark'
import { cn } from '@/lib/cn'
import { CONTENT_SHELL_CLASS } from '@/lib/layout'

const NAV = [
  { href: '#story', label: 'Story' },
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#faq', label: 'FAQ' },
]

const navLinkClass =
  'rounded-sm px-1.5 py-1 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground ' +
  'after:absolute after:-bottom-1 after:left-1.5 after:h-px after:w-[calc(100%-12px)] after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100 ' +
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'

/**
 * Public marketing chrome around the landing page. The `.landing-theme` class
 * scopes the editorial colour + type tokens to this layout only — the dashboard
 * keeps its own palette.
 */
export function MarketingLayout() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

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
    <div className="landing-theme flex min-h-screen flex-col bg-background font-sans text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-card"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className={cn(CONTENT_SHELL_CLASS, 'flex h-16 items-center justify-between gap-4')}>
          <LandingMark />

          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className={cn('relative', navLinkClass)}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LandingButton to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign in
            </LandingButton>
            <LandingButton to="/signup" size="sm" className="hidden sm:inline-flex">
              Start shortening
            </LandingButton>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-md p-2 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 md:hidden"
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
          className="border-t border-border bg-background px-4 py-4 md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn('relative py-2.5', navLinkClass)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <LandingButton
              to="/login"
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Sign in
            </LandingButton>
            <LandingButton
              to="/signup"
              size="md"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Start shortening
            </LandingButton>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card">
        <div className={cn(CONTENT_SHELL_CLASS, 'py-14')}>
          <div className="grid gap-12 lg:grid-cols-[2fr_1fr_1fr]">
            <div>
              <LandingMark />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                A URL shortener with built-in click analytics: short links, custom aliases, and a
                per-link report on every click.
              </p>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Set in Fraunces &amp; Geist
              </p>
            </div>

            <nav aria-label="Product" className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
                Product
              </h2>
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="w-fit rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <nav aria-label="Account" className="flex flex-col gap-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
                Account
              </h2>
              <Link to="/signup" className="w-fit rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground">
                Create account
              </Link>
              <Link to="/login" className="w-fit rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link to="/dashboard" className="w-fit rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground">
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 PathIO — short links with built-in click analytics</span>
            <span className="hidden sm:inline">Long URLs in · stories out</span>
          </div>
        </div>
      </footer>
    </div>
  )
}