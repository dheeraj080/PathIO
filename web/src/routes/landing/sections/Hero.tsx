import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { isValidHttpUrl } from '@/features/shorten/ShortenForm'
import { buildLoginRedirect } from '@/features/shorten/HeroShortenForm'
import { cn } from '@/lib/cn'
import { Kicker, LANDING_SHELL, SHORT_HOST } from '@/routes/landing/primitives'
import { Counter, Reveal } from '@/routes/landing/motion'

/* Deterministic 7-char code (matches the app's [a-zA-Z0-9]{7} short codes) used
 * only for the live preview; the real code is assigned server-side. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

function previewCode(url: string): string {
  let hash = 2166136261
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  let out = ''
  for (let i = 0; i < 7; i++) out += ALPHABET[(hash >>> (i * 4)) & 31]
  return out
}

/** Live "what would this look like" form. Submit routes through the existing auth flow. */
function HeroInput() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [touched, setTouched] = useState(false)
  const statusId = useId()

  const trimmed = url.trim()
  const valid = isValidHttpUrl(trimmed)
  const error = touched && trimmed !== '' && !valid
  const code = valid ? previewCode(trimmed) : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!valid) return
    navigate(buildLoginRedirect(trimmed))
  }

  return (
    <div className="mt-8">
      <form
        onSubmit={handleSubmit}
        noValidate
        className={cn(
          'border bg-card p-2 shadow-card transition-colors',
          error
            ? 'border-destructive/70'
            : 'border-border focus-within:border-foreground/40',
        )}
      >
        <label
          htmlFor="landing-url"
          className="block px-2 pt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
        >
          Destination URL
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="landing-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="https://example.com/some/very/long/path"
            aria-label="Destination URL"
            aria-invalid={error || undefined}
            aria-describedby={error ? statusId : undefined}
            className="h-10 w-full min-w-0 flex-1 bg-transparent px-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <button
            type="submit"
            disabled={touched && !valid}
            className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-foreground px-5 text-sm font-medium tracking-[-0.01em] text-background shadow-card transition-[color,background-color,transform] duration-200 hover:bg-primary hover:text-primary-foreground active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            Shorten URL
            <ArrowRight className="size-4" />
          </button>
        </div>
      </form>

      <div id={statusId} aria-live="polite" className="mt-3 min-h-[1.25rem]">
        {error ? (
          <p className="font-mono text-xs text-destructive">Enter a valid http(s) URL.</p>
        ) : valid && code ? (
          <p className="flex items-baseline gap-2 overflow-hidden font-mono text-xs text-muted-foreground">
            <span className="shrink-0 uppercase tracking-[0.18em] text-muted-foreground/60">
              Preview
            </span>
            <span className="min-w-0 truncate">{trimmed}</span>
            <span aria-hidden="true" className="shrink-0 text-primary">
              →
            </span>
            <span className="shrink-0 text-foreground">
              {SHORT_HOST}/{code}
            </span>
          </p>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">
            Sign in with Google or GitHub to create links — your URL is kept ready.
          </p>
        )}
      </div>

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Sign-in required — Google · GitHub
      </p>
    </div>
  )
}

const LONG_URL =
  'https://shop.example.com/catalog/2026/spring/outdoor/footwear/leather-derby-5002?variant=dark-brown'

/** The same address rendered as its exploded segments, separated by thin rules. */
function ExplodedUrl() {
  const segments = LONG_URL.split('/').filter(Boolean)
  return (
    <div className="flex flex-wrap gap-y-1.5 font-mono text-[11px] leading-5">
      {segments.map((segment, index) => (
        <span key={index} className="flex items-center">
          <span
            className={cn(
              'border-r border-foreground/20 px-2 last:border-r-0',
              index === 0 && 'pl-0',
              index === segments.length - 1 && 'text-foreground/90',
            )}
          >
            {segment}
          </span>
        </span>
      ))}
    </div>
  )
}

/** FIG. A — a long ugly URL collapsing into a short one. */
function CollapseDiagram() {
  const segments = LONG_URL.split('/').filter(Boolean).length
  const code = 'kx7m2q'
  return (
    <figure className="border border-border bg-card shadow-card">
      <figcaption className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Fig. A — one address
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
          illustrative
        </span>
      </figcaption>

      <div className="p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/70">
            Long
          </span>
          <span className="tnum font-mono text-[10px] text-muted-foreground">
            {segments} segments · {LONG_URL.length} chars
          </span>
        </div>

        <div className="mt-3 border-y border-border py-4">
          <ExplodedUrl />
        </div>

        <div className="my-5 flex items-center gap-3">
          <span aria-hidden="true" className="ticks h-3 flex-1" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Collapse
          </span>
          <ArrowDown aria-hidden="true" className="size-3.5 text-primary" />
          <span aria-hidden="true" className="ticks h-3 flex-1" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="truncate font-mono text-sm text-muted-foreground">{SHORT_HOST}/</span>
          <span className="shrink-0 font-display text-3xl font-semibold text-primary">{code}</span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/70">
            Short
          </span>
          <span className="tnum font-mono text-[10px] text-muted-foreground">
            1 segment · {code.length} chars
          </span>
        </div>
      </div>
    </figure>
  )
}

const REFERRERS = [
  { name: 'news.ycombinator.com', pct: 30, count: 312 },
  { name: 'direct', pct: 28, count: 287 },
  { name: 'x.com', pct: 19, count: 198 },
  { name: 't.co', pct: 15, count: 154 },
  { name: 'newsletter', pct: 9, count: 89 },
]

const DEVICES = [
  { name: 'Mobile', pct: 58 },
  { name: 'Desktop', pct: 39 },
  { name: 'Tablet', pct: 3 },
]

/** FIG. B — a small analytics readout beside the collapsed link. */
function AnalyticsReadout() {
  return (
    <figure className="border border-border bg-card shadow-card">
      <figcaption className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Fig. B — the story so far
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
          illustrative
        </span>
      </figcaption>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Total clicks
            </p>
            <p className="mt-2 font-display text-4xl font-semibold text-foreground">
              <Counter value={1040} />
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Unique clicks
            </p>
            <p className="mt-2 font-display text-4xl font-semibold text-foreground">
              <Counter value={621} />
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Referrers
          </p>
          <div className="mt-3 space-y-2.5">
            {REFERRERS.map((referrer) => (
              <div key={referrer.name} className="flex items-center gap-3">
                <span className="w-36 min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                  {referrer.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/25"
                    style={{ width: `${(referrer.pct / REFERRERS[0].pct) * 100}%` }}
                  />
                </div>
                <span className="tnum w-9 shrink-0 text-right font-mono text-[11px] text-foreground">
                  {referrer.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Devices
          </p>
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full" role="img" aria-label="Device split example">
            {DEVICES.map((device, index) => (
              <div
                key={device.name}
                className={cn('h-full', index === 0 ? 'bg-foreground' : index === 1 ? 'bg-foreground/60' : 'bg-foreground/25')}
                style={{ width: `${device.pct}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {DEVICES.map((device, index) => (
              <span key={device.name} className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                <span
                  aria-hidden="true"
                  className={cn('size-1.5 rounded-full', index === 0 ? 'bg-foreground' : index === 1 ? 'bg-foreground/60' : 'bg-foreground/25')}
                />
                {device.name}
                <span className="tnum text-foreground">{device.pct}%</span>
              </span>
            ))}
          </div>
        </div>

        <p className="mt-5 border-t border-border pt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Illustrative example — not your account data.
        </p>
      </div>
    </figure>
  )
}

/** Landing hero: editorial masthead, the message, a live shorten preview, and the two figures. */
export function Hero() {
  return (
    <section className="border-b border-border">
      <div className={cn(LANDING_SHELL, 'pb-16 pt-12 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20')}>
        <Reveal>
          <div className="flex items-center justify-between gap-6 border-b border-border pb-5">
            <Kicker className="flex items-center gap-2.5">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              URL SHORTENER — WITH A MEMORY
            </Kicker>
            <Kicker className="hidden text-right sm:block">
              THE LONG &amp; THE SHORT OF IT
            </Kicker>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Reveal delay={80}>
              <h1 className="font-display text-[2.5rem] font-semibold leading-[0.98] tracking-[-0.02em] text-foreground sm:text-6xl md:text-[4.25rem]">
                Shorten the link.
                <span className="mt-2 block italic text-primary">Keep the story.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Paste a long URL, get a compact, persistent short link — and see every click
                that reaches it: total and unique, day by day, by referrer, by device.
              </p>
            </Reveal>

            <Reveal delay={160}>
              <HeroInput />
            </Reveal>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <Reveal delay={200}>
              <CollapseDiagram />
            </Reveal>
            <Reveal delay={280}>
              <AnalyticsReadout />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}