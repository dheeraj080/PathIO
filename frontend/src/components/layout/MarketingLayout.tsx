import { Link, Outlet } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#analytics', label: 'Analytics' },
]

/** Public marketing chrome: translucent header + footer around the landing page. */
export function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Brand />

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-brand-600 dark:hover:text-brand-400">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <Brand className="text-sm" />
          <p>URL shortener with built-in click analytics.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-brand-600 dark:hover:text-brand-400">
              Sign in
            </Link>
            <Link to="/signup" className="hover:text-brand-600 dark:hover:text-brand-400">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
