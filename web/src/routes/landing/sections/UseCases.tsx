import { cn } from '@/lib/cn'
import { LANDING_SHELL } from '@/routes/landing/primitives'
import { Reveal } from '@/routes/landing/motion'

const CASES = [
  {
    index: '01',
    title: 'Share campaign links',
    text: 'A launch or newsletter URL that is easy to post, print, and read aloud.',
  },
  {
    index: '02',
    title: 'Organize project links',
    text: 'Keep a project’s links together in your dashboard instead of scattered across chat.',
  },
  {
    index: '03',
    title: 'Track engagement',
    text: 'Know how many clicks each link receives — and where those clicks come from.',
  },
]

/** Compact use-cases row: nothing more than a number, a title, and a line. */
export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-24 border-b border-border">
      <div className={cn(LANDING_SHELL, 'py-16 sm:py-20')}>
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            <span className="text-foreground">(05)</span>
            <span className="mx-2 text-muted-foreground/50">—</span>
            Use cases
          </p>
          <h2 className="mt-4 font-display text-[1.9rem] font-medium leading-[1.05] tracking-[-0.015em] sm:text-4xl">
            Where it earns its keep
          </h2>
        </Reveal>

        <Reveal delay={120} className="mt-10">
          <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
            {CASES.map((item) => (
              <article key={item.index} className="py-8 first:pt-0 md:px-8 md:py-4 md:first:pl-0 md:last:pr-0">
                <p className="tnum font-mono text-xs text-muted-foreground">{item.index}</p>
                <h3 className="mt-3 font-display text-xl font-medium text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}