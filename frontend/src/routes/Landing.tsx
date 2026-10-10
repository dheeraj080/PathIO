import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Check,
  Globe2,
  Link2,
  MousePointerClick,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users2,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { FullPageLoading } from '@/components/auth/guards'
import { Button } from '@/components/ui/Button'

const STATS = [
  { value: '7', label: 'character codes' },
  { value: '<10ms', label: 'cached redirects' },
  { value: '30s', label: 'analytics latency' },
  { value: '100%', label: 'OAuth secured' },
]

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant short links',
    text: 'Compact 7-character codes generated in-memory and served from a Redis cache.',
  },
  {
    icon: BarChart3,
    title: 'Depth-rich analytics',
    text: 'Clicks over time, unique visitors, referrer and device breakdowns on every link.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by default',
    text: 'Google & GitHub sign-in, rotating refresh tokens, and HttpOnly cookies.',
  },
  {
    icon: Globe2,
    title: 'Custom aliases',
    text: 'Claim a memorable slug such as /launch-day instead of a random code.',
  },
  {
    icon: QrCode,
    title: 'QR in one tap',
    text: 'Generate a scannable QR for any short link straight from the dashboard.',
  },
  {
    icon: Users2,
    title: 'Built to manage',
    text: 'Edit destinations, delete links, and administer users and links from one console.',
  },
]

const STEPS = [
  {
    title: 'Sign in with Google or GitHub',
    text: 'No forms to fill in. Your account is created on first sign-in and protected by OAuth.',
  },
  {
    title: 'Paste a URL and shorten',
    text: 'Optionally add a custom alias, then copy the link or its QR code for sharing.',
  },
  {
    title: 'Track performance',
    text: 'Watch clicks, unique visitors and their sources accumulate in your dashboard.',
  },
]

function HeroPreview() {
  const bars = [38, 62, 45, 78, 56, 88, 70]
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-brand-200/60 to-brand-400/30 blur-2xl dark:from-brand-900/40 dark:to-brand-700/20"
      />
      <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 truncate">path.io/dashboard</span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
          <Link2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
          <span className="truncate font-mono text-sm text-slate-600 dark:text-slate-300">
            https://example.com/very/long/campaign/link
          </span>
          <span className="ml-auto shrink-0 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">
            Shorten
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-sm dark:border-brand-800 dark:bg-brand-950/40">
          <div className="flex items-center gap-2 font-medium text-brand-700 dark:text-brand-300">
            <Sparkles className="h-4 w-4" /> path.io/launch-day
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total clicks</p>
            <p className="text-lg font-semibold tabular-nums">12.4K</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">Unique</p>
            <p className="text-lg font-semibold tabular-nums">8,120</p>
          </div>
        </div>

        <div className="mt-4 flex h-24 items-end gap-2">
          {bars.map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-t bg-gradient-to-t from-brand-500 to-brand-300 dark:from-brand-600 dark:to-brand-400"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function Landing() {
  const { status } = useAuth()

  if (status === 'loading') return <FullPageLoading />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,theme(colors.brand.100)_0%,transparent_100%)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,theme(colors.brand.950)_0%,transparent_100%)]"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              Fast · Analytics-rich · OAuth-secured
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Shorten links.
              <span className="block bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-200">
                Understand every click.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
              PathIO turns long URLs into compact, shareable links — and shows you exactly who is
              clicking, from where, and on what device.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <Button size="lg">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {['No credit card', 'Unlimited links', 'Google & GitHub sign-in'].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to share and measure
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            A URL shortener that keeps its promises: fast redirects, honest analytics, and simple
            management.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Live in three steps</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              From long URL to readable analytics in under a minute.
            </p>
          </div>

          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Analytics highlight */}
      <section id="analytics" className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
            <MousePointerClick className="h-3.5 w-3.5" />
            Analytics
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Know what happens after the click
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Every redirect is recorded asynchronously, so links stay fast while your dashboard fills
            with signals you can act on.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              'Total and unique clicks per link',
              'Zero-filled day-by-day click history',
              'Top referrers and device types',
              'Account-wide totals at a glance',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="order-1 lg:order-2">
          <HeroPreview />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-8 py-16 text-center text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            Start shortening in seconds
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/80">
            Sign in with Google or GitHub — your first link is ready before you finish reading this.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-brand-700 hover:bg-white/90">
                Create your first link
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
