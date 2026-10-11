import { Outlet } from 'react-router-dom'
import { BarChart3, Link2, LogIn, Pencil } from 'lucide-react'
import { Brand } from '@/components/Brand'
import { ThemeToggle } from '@/components/ThemeToggle'

const HIGHLIGHTS = [
  { icon: Link2, title: 'Short links', text: 'Optional custom aliases for every link.' },
  { icon: BarChart3, title: 'Click analytics', text: 'Total, unique, history, referrers, devices.' },
  { icon: Pencil, title: 'Link management', text: 'Edit, copy, or delete the links you own.' },
  { icon: LogIn, title: 'Simple sign-in', text: 'Google and GitHub, no passwords to manage.' },
]

/**
 * Split-screen chrome for the login / signup pages. The left panel summarises
 * the real product capabilities; the right side renders the auth card via
 * <Outlet/>. Uses the same neutral, light-first surfaces as the marketing site.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 lg:grid lg:grid-cols-2 dark:bg-slate-950 dark:text-slate-100">
      {/* Product panel (large screens only) */}
      <aside className="relative hidden border-r border-slate-200 bg-white p-10 lg:flex lg:flex-col xl:p-12 dark:border-slate-800 dark:bg-slate-900">
        <Brand to="/" />

        <div className="mt-auto">
          <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight">
            Shorten links.
            <span className="block text-brand-600 dark:text-brand-400">Understand every click.</span>
          </h2>
          <p className="mt-3 max-w-sm text-sm text-slate-600 dark:text-slate-300">
            Create short links, optionally choose a custom alias, and review the analytics for every
            link you own.
          </p>

          <ul className="mt-8 grid max-w-md gap-4 sm:grid-cols-2">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Auth card */}
      <main className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
