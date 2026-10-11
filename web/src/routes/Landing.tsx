import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Check,
  FolderOpen,
  Link2,
  Megaphone,
  Pencil,
  ShieldCheck,
  TrendingUp,
  Wand2,
} from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { FullPageLoading } from '@/components/auth/guards'
import { Button } from '@/components/ui/Button'
import { HeroShortenForm } from '@/features/shorten/HeroShortenForm'
import { useDocumentMetadata } from '@/lib/useDocumentMetadata'

const HERO_POINTS = ['Google & GitHub sign-in', 'Custom aliases', 'Click & referrer analytics']

const FEATURES = [
  {
    icon: Link2,
    title: 'Short links',
    text: 'Turn any long URL into a compact, persistent short link that you can share anywhere.',
  },
  {
    icon: Wand2,
    title: 'Custom aliases',
    text: 'Pick a memorable alias for a link when available, subject to basic validation and availability.',
  },
  {
    icon: BarChart3,
    title: 'Click analytics',
    text: 'Review total and unique clicks, a day-by-day history, referrer domains, and device breakdowns.',
  },
  {
    icon: Pencil,
    title: 'Link management',
    text: 'View, edit, copy, and delete the links you own from one dashboard.',
  },
  {
    icon: ShieldCheck,
    title: 'Simple sign-in',
    text: 'Sign in with Google or GitHub. Administrators keep their own separate email and password login.',
  },
]

const STEPS = [
  {
    icon: Link2,
    title: 'Enter a destination URL',
    text: 'Paste the long URL you want to share. Add a custom alias if you would like one.',
  },
  {
    icon: Wand2,
    title: 'Generate and share the link',
    text: 'Create the short link, then copy it or open it directly to confirm it redirects.',
  },
  {
    icon: TrendingUp,
    title: 'Review the analytics',
    text: 'Open a link to see its clicks over time, top referrers, and device breakdown.',
  },
]

const USE_CASES = [
  {
    icon: Megaphone,
    title: 'Share campaign links',
    text: 'Create a short link for a launch or newsletter so it is easy to post, print, and read aloud.',
  },
  {
    icon: FolderOpen,
    title: 'Organize project links',
    text: 'Keep the links for a project together in your dashboard instead of scattered across chats.',
  },
  {
    icon: TrendingUp,
    title: 'Track engagement',
    text: 'See how many clicks each link receives and where those clicks come from.',
  },
]

const FAQ = [
  {
    q: 'How do I create a short link?',
    a: 'Enter a destination URL, sign in with Google or GitHub if you have not already, and confirm. The short link is created on the server and shown to you to copy.',
  },
  {
    q: 'Can I choose a custom alias?',
    a: 'Yes. When creating a link you can optionally add a custom alias such as "launch-day". Aliases use letters, numbers, hyphens, and underscores, and must not already be taken.',
  },
  {
    q: 'What analytics are available?',
    a: 'For each link you can view total clicks, unique clicks, a day-by-day click history, the top referrer domains, and a device breakdown. Account-wide totals are shown on the dashboard.',
  },
  {
    q: 'Can I edit or delete a link?',
    a: 'Yes. From your dashboard you can update a link’s destination or delete it. Administrators can manage links across the service.',
  },
  {
    q: 'How do I sign in?',
    a: 'Regular accounts use Google or GitHub sign-in. Administrators sign in with the email and password that were provisioned for the environment.',
  },
  {
    q: 'Is the destination URL validated?',
    a: 'Yes. The app only accepts http and https URLs, and the backend applies additional URL-safety checks before a link is created.',
  },
]

/**
 * Illustrative mock of the dashboard, built from the same layout primitives as
 * the real app. It is presented as a preview: the figures are examples, not
 * account data.
 */
function ProductPreview() {
  const bars = [42, 58, 36, 72, 50, 84, 64]
  return (
    <div
      role="img"
      aria-label="Illustrative preview of the PathIO dashboard showing a short link and an example click chart. Figures are examples, not real data."
      className="relative"
    >
      <span className="absolute right-3 top-3 z-10 rounded-full border border-slate-200 bg-white/90 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-400">
        Preview
      </span>

      <div
        aria-hidden="true"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 truncate">PathIO dashboard</span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
          <Link2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
          <span className="truncate font-mono text-sm text-slate-600 dark:text-slate-300">
            example.com/campaigns/spring-launch
          </span>
          <span className="ml-auto shrink-0 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">
            Shorten
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50/60 p-3 text-sm dark:border-brand-800 dark:bg-brand-950/40">
          <div className="flex items-center gap-2 font-mono font-medium text-brand-700 dark:text-brand-300">
            <Link2 className="h-4 w-4" />
            /launch-day
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total clicks</p>
            <p className="text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              128
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">Unique</p>
            <p className="text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              96
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Clicks · last 7 days</p>
          <div className="mt-2 flex h-20 items-end gap-2">
            {bars.map((height, index) => (
              <span
                key={index}
                className="flex-1 rounded-t bg-brand-400/80 dark:bg-brand-500/70"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        Example interface — the figures shown are illustrative, not your account data.
      </p>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-3 text-slate-600 dark:text-slate-300">{description}</p>
      ) : null}
    </div>
  )
}

export function Landing() {
  const { status } = useAuth()

  useDocumentMetadata({
    title: 'PathIO — Shorten links and understand every click',
    description:
      'PathIO is a URL shortener with custom aliases and built-in click analytics: total and unique clicks, click history, referrers, and devices.',
  })

  if (status === 'loading') return <FullPageLoading />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Short links · Custom aliases · Click analytics
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Shorten links.
              <span className="block text-brand-600 dark:text-brand-400">
                Understand every click.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
              Create short links, optionally choose a custom alias, copy and share them, and review
              the click analytics for every link you own.
            </p>

            <div className="mt-8 max-w-xl">
              <HeroShortenForm />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Sign in to your dashboard
                </Button>
              </Link>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                {HERO_POINTS.map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20">
        <SectionHeading
          eyebrow="Features"
          title="What PathIO does"
          description="Everything below is available in the app today — nothing more, nothing less."
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
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
      <section
        id="how"
        className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-20">
          <SectionHeading
            eyebrow="How it works"
            title="Three steps from link to insight"
            description="From a long URL to a working short link with analytics in three steps."
          />

          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li
                key={title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="mx-auto w-full max-w-6xl px-4 py-20">
        <SectionHeading
          eyebrow="Use cases"
          title="A few ways people use it"
          description="PathIO is a focused URL shortener. These are examples of how the available features fit into everyday work."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {USE_CASES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-20">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />

          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 rounded text-base font-medium text-slate-800 focus-visible:outline dark:text-slate-100">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-slate-400 transition-transform group-open:rotate-45 dark:text-slate-500"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white px-8 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Create your first short link
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
            Sign in with Google or GitHub and start shortening links with analytics.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup">
              <Button size="lg">
                Start shortening
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
