import { Button } from '@/components/ui/Button'
import { requestCreateLink } from '@/lib/events'

/** First-run empty state, kept deliberately quiet: a rule, a title, one action. */
export function EmptyLinksState() {
  return (
    <div className="flex flex-col items-center border-t border-border px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        No links yet
      </p>
      <h2 className="mt-3 font-display text-3xl font-medium tracking-[-0.02em] text-foreground">
        Create your first short link
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Shorten a URL to start tracking clicks, referrers and devices.
      </p>
      <Button type="button" className="mt-6" onClick={() => requestCreateLink()}>
        Create a link
      </Button>
    </div>
  )
}
