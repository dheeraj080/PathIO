import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLinkWindow } from '@/features/links/useLinkWindow'
import { isValidHttpUrl } from '@/features/shorten/ShortenForm'

/**
 * Dismissible first-link nudge for accounts that have no links yet.
 *
 * The empty state is derived from the loaded links response (never a local
 * flag), so it disappears as soon as the account owns a link. When a valid
 * `prefill` URL is present the nudge points at the prefilled shorten flow and
 * offers a way to discard the carried URL without submitting it.
 */
export function FirstLinkNudge({ onStart }: { onStart?: () => void }) {
  const [dismissed, setDismissed] = useState(false)
  const [params, setParams] = useSearchParams()
  const { data, isLoading, isError } = useLinkWindow()

  const rawPrefill = params.get('prefill')
  const prefill = rawPrefill && isValidHttpUrl(rawPrefill) ? rawPrefill : null

  const clearPrefill = () => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('prefill')
        return next
      },
      { replace: true },
    )
  }

  const dismiss = () => {
    setDismissed(true)
    if (prefill) clearPrefill()
  }

  // Only an actually-empty account (per the loaded response) sees the nudge.
  if (dismissed || isLoading || isError || !data || data.totalElements > 0) return null

  return (
    <section
      aria-label="Getting started"
      className="flex flex-col gap-4 border-y border-border py-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          {prefill ? 'In progress' : 'Getting started'}
        </p>
        <h2 className="mt-1 font-display text-lg font-medium tracking-[-0.01em] text-foreground">
          {prefill ? 'Finish creating your short link' : 'Create your first short link'}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {prefill
            ? 'We kept the URL you started on the home page. It is ready in the shortener below — review it and create your link.'
            : 'Paste a destination URL in the box below to create your first short link. You can add a custom alias too.'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" size="sm" onClick={() => onStart?.()}>
          {prefill ? 'Review your link' : 'Start shortening'}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={dismiss}
          aria-label={prefill ? 'Discard the carried URL' : 'Dismiss getting-started tip'}
        >
          <X className="h-4 w-4" />
          {prefill ? 'Discard' : 'Dismiss'}
        </Button>
      </div>
    </section>
  )
}
