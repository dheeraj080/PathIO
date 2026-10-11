import { Link2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { requestCreateLink } from '@/lib/events'

const PREVIEW_ROWS = 6
const LOOP_COUNT = 2

/** First-run empty state: a softly scrolling stack of placeholder rows. */
export function EmptyLinksState() {
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-xl border-[0.5px] border-border bg-card px-6 py-12 text-center">
      <div className="pointer-events-none relative mb-8 h-40 w-full max-w-md select-none overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]">
        <div className="animate-vertical-scroll flex flex-col gap-3">
          {Array.from({ length: LOOP_COUNT }).flatMap((_, loop) =>
            Array.from({ length: PREVIEW_ROWS }).map((__, index) => (
              <div
                key={`${loop}-${index}`}
                className="flex items-center gap-3 rounded-xl border-[0.5px] border-border bg-card/60 p-3"
              >
                <span className="size-8 shrink-0 rounded-full bg-muted" />
                <span className="h-3.5 w-2/3 rounded bg-muted" />
              </div>
            )),
          )}
        </div>
      </div>

      <span className="flex size-14 items-center justify-center rounded-2xl border-[0.5px] border-border bg-muted text-muted-foreground">
        <Link2 className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">No links yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create your first short link and start tracking clicks, referrers, and devices.
      </p>
      <Button type="button" className="mt-6" onClick={() => requestCreateLink()}>
        <Plus className="size-4" />
        Create your first link
      </Button>
    </div>
  )
}
