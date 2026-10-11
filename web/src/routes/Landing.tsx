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
      <span className="absolute right-3 top-3 z-10 rounded-md border-[0.5px] border-border bg-card/90 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        Preview
      </span>

      <div
        aria-hidden="true"
        className="rounded-2xl border-[0.5px] border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 truncate">PathIO dashboard</span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted p-2">
          <Link2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate font-mono text-sm text-muted-foreground">
            example.com/campaigns/spring-launch
          </span>
          <span className="ml-auto shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            Shorten
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <div className="flex items-center gap-2 font-mono font-medium text-primary">
            <Link2 className="h-4 w-4" />
            /launch-day
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Total clicks</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">128</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Unique</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">96</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs text-muted-foreground">Clicks · last 7 days</p>
          <div className="mt-2 flex h-20 items-end gap-2">
            {bars.map((height, index) => (
              <span
                key={index}
                className="flex-1 rounded-t bg-chart-clicks/80"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
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
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-3 text-muted-foreground">{description}</p>
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
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-[0.5px] border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              Short links · Custom aliases · Click analytics
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Shorten links.
              <span className="block text-primary">Understand every click.</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
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
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {HERO_POINTS.map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-primary" />
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
              className="rounded-2xl border-[0.5px] border-border bg-card p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border bg-card">
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
                className="rounded-2xl border-[0.5px] border-border bg-card p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
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
              className="rounded-2xl border-[0.5px] border-border bg-card p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-3xl px-4 py-20">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />

          <div className="mt-10 divide-y divide-border rounded-2xl border-[0.5px] border-border bg-card">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 rounded text-base font-medium text-foreground focus-visible:outline">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border-[0.5px] border-primary/20 bg-primary/5 px-8 py-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Create your first short link
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
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
