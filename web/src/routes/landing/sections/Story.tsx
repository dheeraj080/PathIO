import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { LANDING_SHELL, SectionHeading, SHORT_HOST } from '@/routes/landing/primitives'
import { Reveal, useInView } from '@/routes/landing/motion'

/** Illustrative day-by-day click counts for one fictional link (labeled below). */
const STORY_DAYS = [14, 26, 18, 41, 30, 58, 44, 72, 61, 88, 79, 96, 84, 104]

const TIMELINE = [
  { time: 'Day 0 · 09:12', text: 'Link created from the campaign URL' },
  { time: 'Day 0 · +2h', text: 'First click — desktop, direct' },
  { time: 'Day 3', text: 'Shared in newsletter № 42' },
  { time: 'Day 5', text: 'Peak — 312 clicks from news.ycombinator.com' },
]

const REFERRERS = [
  { name: 'news.ycombinator.com', pct: 30 },
  { name: 'direct', pct: 28 },
  { name: 'x.com', pct: 19 },
  { name: 't.co', pct: 15 },
  { name: 'newsletter', pct: 9 },
]

const DEVICES = [
  { name: 'Mobile', pct: 58 },
  { name: 'Desktop', pct: 39 },
  { name: 'Tablet', pct: 3 },
]

const maxClicks = Math.max(...STORY_DAYS)
const peakIndex = STORY_DAYS.indexOf(maxClicks)

/** Bars + accented trend line for the story panel. */
function StoryChart() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  const points = STORY_DAYS.map(
    (clicks, index) => `${((index + 0.5) / STORY_DAYS.length) * 100},${100 - (clicks / maxClicks) * 100}`,
  ).join(' ')
  const peakX = ((peakIndex + 0.5) / STORY_DAYS.length) * 100

  return (
    <div ref={ref} className="relative mt-6 h-44 w-full sm:h-52">
      {/* faint horizontal gridlines */}
      {[0, 33, 66].map((offset) => (
        <div
          key={offset}
          aria-hidden="true"
          className="absolute inset-x-0 border-t border-foreground/10"
          style={{ top: `${offset}%` }}
        />
      ))}

      {/* columns of bars — grew on reveal */}
      <div className="absolute inset-x-0 bottom-0 top-0 flex items-end">
        {STORY_DAYS.map((clicks, index) => (
          <div key={index} className="flex h-full flex-1 items-end justify-center">
            <div
              className={cn(
                'bar-grow w-[55%] max-w-[11px] rounded-t-[1px]',
                index === peakIndex ? 'bg-primary' : 'bg-foreground/15',
                inView && 'is-inview',
              )}
              style={
                {
                  height: `${(clicks / maxClicks) * 100}%`,
                  '--bar-delay': `${index * 40}ms`,
                } as CSSProperties
              }
            />
          </div>
        ))}
      </div>

      {/* accent trend line + soft area fill */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="story-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--chart-clicks))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(var(--chart-clicks))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M${points.replaceAll(' ', ' L')} L 100,100 L 0,100 Z`}
          fill="url(#story-area)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="rgb(var(--chart-clicks))"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* peak marker */}
      <div
        aria-hidden="true"
        className="absolute -top-1 size-2 -translate-x-1/2 animate-glow-pulse rounded-full bg-primary"
        style={{ left: `${peakX}%` }}
      />
    </div>
  )
}

/** Showpiece section: one link, followed from creation to analytics. */
export function Story() {
  return (
    <section id="story" className="scroll-mt-24 border-b border-border">
      <div className={cn(LANDING_SHELL, 'py-16 sm:py-24')}>
        <Reveal>
          <SectionHeading
            index="02"
            kicker="The link, then the story"
            title="One short link. A full report."
            description="Follow a single link from the moment it is created to the clicks it collects — a day-by-day history, the top referrers, and which devices clicked it."
          />
        </Reveal>

        <Reveal delay={120} className="mt-10 sm:mt-12">
          <figure className="border border-border bg-card shadow-card">
            <figcaption className="flex flex-col gap-1.5 border-b border-border px-6 py-4 sm:flex-row sm:items-baseline sm:gap-3 sm:px-7">
              <span className="font-mono text-sm text-foreground">{SHORT_HOST}/</span>
              <span className="font-mono text-sm font-medium text-primary">launch-day</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:ml-auto sm:inline">
                Created 24 Aug 2026 · 09:12 · Src: newsletter
              </span>
            </figcaption>

            <div className="grid lg:grid-cols-[240px_1fr]">
              <div className="border-b border-border p-6 sm:p-7 lg:border-b-0 lg:border-r">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Timeline
                </p>
                <ol className="mt-5 space-y-7 border-l border-foreground/20 pl-5">
                  {TIMELINE.map((entry) => (
                    <li key={entry.time} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[1.5rem] top-0.5 size-2 rounded-full border border-foreground/40 bg-background"
                      />
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                        {entry.time}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {entry.text}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-6 sm:p-7">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Clicks by day — last 14 days
                  </p>
                  <p className="tnum font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/70">
                    Peak {maxClicks}
                  </p>
                </div>

                <StoryChart />

                <div className="mt-3 flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>24 Aug</span>
                  <span>30 Aug</span>
                  <span>6 Sep</span>
                </div>
              </div>
            </div>

            <div className="grid border-t border-border md:grid-cols-2">
              <div className="border-b border-border p-6 sm:p-7 md:border-b-0 md:border-r">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Top referrers
                </p>
                <div className="mt-4 space-y-3">
                  {REFERRERS.map((referrer, index) => (
                    <div key={referrer.name} className="flex items-center gap-3">
                      <span className="w-40 min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                        {referrer.name}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', index === 0 ? 'bg-primary' : 'bg-foreground/25')}
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

              <div className="p-6 sm:p-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Devices
                </p>
                <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full" role="img" aria-label="Device split example">
                  {DEVICES.map((device, index) => (
                    <div
                      key={device.name}
                      className={cn(
                        'h-full',
                        index === 0 ? 'bg-foreground' : index === 1 ? 'bg-foreground/60' : 'bg-foreground/25',
                      )}
                      style={{ width: `${device.pct}%` }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {DEVICES.map((device, index) => (
                    <span key={device.name} className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'size-1.5 rounded-full',
                          index === 0 ? 'bg-foreground' : index === 1 ? 'bg-foreground/60' : 'bg-foreground/25',
                        )}
                      />
                      {device.name}
                      <span className="tnum text-foreground">{device.pct}%</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <footer className="border-t border-border px-6 py-3.5 sm:px-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Illustrative sample — the figures above are examples, not your account data.
              </p>
            </footer>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}