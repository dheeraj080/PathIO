import { cn } from '@/lib/cn'
import { LANDING_SHELL } from '@/routes/landing/primitives'
import { Reveal } from '@/routes/landing/motion'

const FAQ = [
  {
    question: 'How do I create a short link?',
    answer:
      'Paste a destination URL, sign in with Google or GitHub if you have not already, and confirm. The short link is created on the server and shown for you to copy.',
  },
  {
    question: 'Can I choose a custom alias?',
    answer:
      'Yes. When creating a link you can add an alias such as "launch-day". Aliases use letters, numbers, hyphens, and underscores, and must not already be taken.',
  },
  {
    question: 'What analytics are available?',
    answer:
      'Per link: total clicks, unique clicks, a day-by-day click history, the top referrer domains, and a device breakdown. Account-wide totals are shown on the dashboard.',
  },
  {
    question: 'Can I edit or delete a link?',
    answer:
      'Yes. From your dashboard you can update a link’s destination or delete it. Administrators can manage links across the service.',
  },
  {
    question: 'How do I sign in?',
    answer:
      'Regular accounts use Google or GitHub sign-in. Administrators sign in with the email and password provisioned for the environment.',
  },
  {
    question: 'Is the destination URL validated?',
    answer:
      'Yes. Only http and https URLs are accepted, and the backend applies additional URL-safety checks before a link is created.',
  },
]

/** FAQ with native <details>/<summary>, styled as an editorial disclosure. */
export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-b border-border">
      <div className={cn(LANDING_SHELL, 'py-16 sm:py-24')}>
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                <span className="text-foreground">(06)</span>
                <span className="mx-2 text-muted-foreground/50">—</span>
                FAQ
              </p>
              <h2 className="mt-4 font-display text-[1.9rem] font-medium leading-[1.05] tracking-[-0.015em] sm:text-4xl">
                Straight answers
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                None of the usual dodging — if it is not listed here, it does not exist yet.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-8">
            <div className="border-b border-border">
              {FAQ.map((item) => (
                <details key={item.question} className="group border-t border-border">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden focus-visible:outline-none">
                    <span className="flex items-baseline gap-4">
                      <span aria-hidden="true" className="font-mono text-xs text-muted-foreground">
                        Q.
                      </span>
                      <span className="font-display text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl">
                        {item.question}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-mono text-sm text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="pb-6 pl-9 pr-2 group-open:animate-fade-in sm:pl-10">
                    <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {item.answer}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}