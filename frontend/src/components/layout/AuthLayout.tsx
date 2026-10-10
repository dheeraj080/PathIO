import { Outlet } from 'react-router-dom'
import { BarChart3, Globe2, ShieldCheck, Zap } from 'lucide-react'
import { Brand } from '@/components/Brand'

const HIGHLIGHTS = [
  { icon: Zap, title: 'Instant links', text: '7-character codes served straight from cache.' },
  { icon: BarChart3, title: 'Real analytics', text: 'Clicks, referrers and devices on every link.' },
  { icon: ShieldCheck, title: 'OAuth secured', text: 'Google & GitHub sign-in with rotating tokens.' },
  { icon: Globe2, title: 'Custom aliases', text: 'Your own memorable slugs for every campaign.' },
]

/**
 * Split-screen chrome for the login / signup pages. The left panel is
 * decorative marketing; the right side renders the auth card via <Outlet/>.
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-2 dark:bg-slate-950 dark:text-slate-100">
      {/* Marketing panel (large screens only) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl"
        />

        <Brand to="/" className="relative text-white" />

        <div className="relative mt-auto">
          <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight">
            Shorten links. Understand every click.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-white/80">
            Create branded short links and watch performance build up in real time.
          </p>

          <ul className="mt-8 grid max-w-md gap-4 sm:grid-cols-2">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Auth card */}
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
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
