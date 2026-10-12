import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { LandingButton } from '@/routes/landing/LandingButton'
import { LANDING_SHELL } from '@/routes/landing/primitives'
import { Reveal } from '@/routes/landing/motion'

/** Closing statement: one line, two buttons, zero filler. */
export function FinalCta() {
  return (
    <section className="border-b border-border">
      <div className={cn(LANDING_SHELL, 'py-20 sm:py-28')}>
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              <span className="text-foreground">(07)</span>
              <span className="mx-2 text-muted-foreground/50">—</span>
              Next link
            </p>
            <h2 className="mt-5 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.02em] text-foreground sm:text-5xl md:text-6xl">
              Make the next link
              <span className="block italic text-primary">tell you where it has been.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              Sign in with Google or GitHub and start shortening. Your links, and every click
              on them, in one dashboard.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <LandingButton to="/signup" size="lg">
                Start shortening
                <ArrowRight />
              </LandingButton>
              <LandingButton to="/login" size="lg" variant="ghost">
                Sign in
              </LandingButton>
            </div>
            <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Regular accounts — Google · GitHub — Administrators — email &amp; password
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}