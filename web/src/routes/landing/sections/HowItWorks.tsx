import { cn } from '@/lib/cn'
import { LANDING_SHELL, SectionHeading } from '@/routes/landing/primitives'
import { Reveal } from '@/routes/landing/motion'

const STEPS = [
  {
    index: '01',
    title: 'Paste',
    text: 'Enter the destination URL. Add a custom alias if you would like one.',
    tag: 'Input · http(s) validated',
  },
  {
    index: '02',
    title: 'Generate & share',
    text: 'The short link is created, ready to copy into an email, a post, or a page.',
    tag: 'Shorten · one link to share',
  },
  {
    index: '03',
    title: 'Review the story',
    text: 'Open the link to see clicks over time, top referrers, and device breakdowns.',
    tag: 'Analyze · per link',
  },
]

/** Three steps drawn as a connected path rather than three boxes. */
export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 border-b border-border">
      <div className={cn(LANDING_SHELL, 'py-16 sm:py-24')}>
        <Reveal>
          <SectionHeading
            index="04"
            kicker="How it works"
            title="Three moves. Then it's all story."
            description="From a long URL to a working short link with analytics — in three steps."
          />
        </Reveal>

        <Reveal delay={120} className="mt-12 sm:mt-16">
          <ol className="relative flex flex-col gap-10 md:grid md:grid-cols-3 md:gap-12">
            {/* the path — vertical on mobile, horizontal on desktop */}
            <div
              aria-hidden="true"
              className="absolute inset-y-3 left-6 w-px -translate-x-1/2 bg-border md:hidden"
            />
            <div
              aria-hidden="true"
              className="absolute left-1/6 right-1/6 top-6 hidden h-px bg-border md:block"
            />
            <span
              aria-hidden="true"
              className="absolute -right-1.5 top-6 hidden -translate-y-1/2 font-mono text-primary md:block"
            >
              →
            </span>

            {STEPS.map((step) => (
              <li key={step.index} className="relative flex items-start gap-5 md:block md:text-center">
                <span className="relative z-10 inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-background font-display text-base font-semibold text-foreground shadow-card">
                  {step.index}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-2xl font-medium tracking-[-0.01em] text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground md:mx-auto">
                    {step.text}
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {step.tag}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}