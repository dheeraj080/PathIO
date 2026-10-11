import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Brand } from '@/components/Brand'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#use-cases', label: 'Use cases' },
  { href: '#faq', label: 'FAQ' },
]

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
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md dark:focus:bg-slate-800"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Brand />

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
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
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="marketing-mobile-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          id="marketing-mobile-menu"
          ref={menuRef}
          hidden={!open}
          className="border-t border-slate-200 bg-white px-4 py-4 md:hidden dark:border-slate-800 dark:bg-slate-950"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
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

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Brand />
            <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              A URL shortener with built-in click analytics. Create short links, choose custom
              aliases, and see how each link performs.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Product</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={cn(
                      'rounded text-slate-500 transition-colors hover:text-brand-600',
                      'focus-visible:outline dark:text-slate-400 dark:hover:text-brand-400',
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  to="/signup"
                  className="rounded text-slate-500 transition-colors hover:text-brand-600 focus-visible:outline dark:text-slate-400 dark:hover:text-brand-400"
                >
                  Create account
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="rounded text-slate-500 transition-colors hover:text-brand-600 focus-visible:outline dark:text-slate-400 dark:hover:text-brand-400"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="rounded text-slate-500 transition-colors hover:text-brand-600 focus-visible:outline dark:text-slate-400 dark:hover:text-brand-400"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
            PathIO — URL shortener with built-in click analytics.
          </div>
        </div>
      </footer>
    </div>
  )
}
