import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { LANDING_SHELL, SectionHeading } from '@/routes/landing/primitives'
import { Reveal } from '@/routes/landing/motion'

const FEATURES = [
  {
    index: '01',
    title: 'Short links',
    tag: 'THE URL',
    text: 'Turn any long URL into a compact, persistent short link you can share anywhere.',
  },
  {
    index: '02',
    title: 'Custom aliases',
    tag: 'YOUR SLUG',
    text: 'Give a link a memorable alias when it is available, subject to basic validation.',
  },
  {
    index: '03',
    title: 'Click analytics',
    tag: 'THE STORY',
    text: 'Total and unique clicks, a day-by-day history, top referrer domains, and device breakdowns.',
  },
  {
    index: '04',
    title: 'Link management',
    tag: 'YOURS',
    text: 'View, edit, copy, and delete the links you own — all from one dashboard.',
  },
  {
    index: '05',
    title: 'Simple sign-in',
    tag: 'GOOGLE · GITHUB',
    text: 'Sign in with Google or GitHub. Administrators keep a separate email and password login.',
  },
]

/** Features as an editorial index — numbers, thin rules, hover reveals, no cards. */
export function Features() {
  return (
    <section id="features" className="scroll-mt-24 border-b border-border">
      <div className={cn(LANDING_SHELL, 'py-16 sm:py-24')}>
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <SectionHeading
                index="03"
                kicker="What's inside"
                title="Five features. Nothing else."
                description="Everything listed below exists in the app today — no roadmap, no vaporware."
              />
            </div>
          </Reveal>

          <div className="lg:col-span-8">
            <div className="border-t border-border">
              {FEATURES.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 60}>
                  <article className="group relative border-b border-border transition-colors hover:bg-card">
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-primary transition-transform duration-300 ease-out group-hover:scale-y-100"
                    />
                    <div className="grid gap-2 py-6 pl-4 sm:grid-cols-[3.5rem_1fr_auto] sm:items-baseline sm:gap-6 sm:py-7">
                      <span className="tnum font-mono text-xs text-muted-foreground">
                        {feature.index}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-2xl font-medium tracking-[-0.01em] text-foreground transition-all duration-200 group-hover:italic sm:text-3xl">
                          {feature.title}
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                          {feature.text}
                        </p>
                      </div>
                      <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-primary sm:flex">
                        {feature.tag}
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}