import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Link2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useMyLinks } from '@/features/links/useMyLinks'
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
  const { data, isLoading, isError } = useMyLinks(0)

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
      className="flex flex-col gap-4 rounded-xl border border-brand-200 bg-brand-50/60 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-brand-800 dark:bg-brand-950/40"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          {prefill ? <Sparkles className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {prefill ? 'Finish creating your short link' : 'Create your first short link'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            {prefill
              ? 'We kept the URL you started on the home page. It is ready in the shortener below — review it and create your link.'
              : 'Paste a destination URL in the box below to create your first short link. You can add a custom alias too.'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
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
