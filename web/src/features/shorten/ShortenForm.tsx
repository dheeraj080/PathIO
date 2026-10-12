import { useEffect, useState, type FormEvent, type Ref } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ExternalLink, QrCode } from 'lucide-react'
import { CREATE_LINK_EVENT } from '@/lib/events'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CopyButton } from '@/components/ui/CopyButton'
import { useToast } from '@/components/ui/Toast'
import { QrPanel } from '@/features/shorten/QrPanel'
import { useShortenLink } from '@/features/shorten/useShortenLink'
import { useAuth } from '@/auth/useAuth'
import type { ShortenUrlResponse } from '@/types/api'

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/
const ALIAS_MAX_LENGTH = 32

export function ShortenForm({ inputRef }: { inputRef?: Ref<HTMLInputElement> } = {}) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  // A destination URL carried through the login redirect (see the marketing
  // hero) prefills the input so the visitor's intent is preserved.
  const prefill = params.get('prefill')
  const [longUrl, setLongUrl] = useState(() => (prefill && isValidHttpUrl(prefill) ? prefill : ''))
  const [alias, setAlias] = useState('')
  const [showAlias, setShowAlias] = useState(false)
  const [touched, setTouched] = useState(false)
  const [result, setResult] = useState<ShortenUrlResponse | null>(null)
  const [showQr, setShowQr] = useState(false)

  const { mutate, isPending } = useShortenLink()

  // The global "Create link" header action focuses this form wherever it mounts.
  useEffect(() => {
    const handleCreate = () => {
      const ref = inputRef
      const element = typeof ref === 'function' ? null : ref?.current
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      element?.focus()
    }
    window.addEventListener(CREATE_LINK_EVENT, handleCreate)
    return () => window.removeEventListener(CREATE_LINK_EVENT, handleCreate)
  }, [inputRef])

  const urlError = touched && !isValidHttpUrl(longUrl.trim()) ? 'Enter a valid http(s) URL.' : null

  const aliasValue = alias.trim()
  const aliasError =
    showAlias && aliasValue.length > 0 && !ALIAS_PATTERN.test(aliasValue)
      ? 'Only letters, numbers, hyphens and underscores (max 32).'
      : null

  // Drop the carried `prefill` parameter without disturbing any other query
  // parameters and without a full-page reload.
  const clearPrefill = () => {
    if (!params.get('prefill')) return
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('prefill')
        return next
      },
      { replace: true },
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    const value = longUrl.trim()
    if (!isValidHttpUrl(value)) return
    if (aliasError) return

    if (!isAuthenticated) {
      toast.push('Sign in to create your short link', 'info')
      navigate('/login?redirect=%2Fdashboard')
      return
    }
    mutate(
      { longUrl: value, alias: aliasValue || undefined },
      {
        onSuccess: (data) => {
          setResult(data)
          setLongUrl('')
          setAlias('')
          setShowAlias(false)
          setShowQr(false)
          setTouched(false)
          clearPrefill()
        },
      },
    )
  }

  return (
    <section className="border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">
            Shorten a URL
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste a destination to create a short, trackable link with click analytics, referrers
            and device breakdowns.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <Input
              ref={inputRef}
              aria-label="Long URL"
              placeholder="https://example.com/very/long/path"
              value={longUrl}
              onChange={(event) => setLongUrl(event.target.value)}
              onBlur={() => setTouched(true)}
              error={urlError}
              className="h-12 font-mono"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            loading={isPending}
            className="h-12 shrink-0 px-6"
          >
            Shorten URL
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAlias((value) => !value)}
            aria-expanded={showAlias}
            className="text-sm text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
          >
            {showAlias ? 'Hide custom alias' : 'Add a custom alias'}
          </button>
        </div>

        {showAlias ? (
          <Input
            label="Custom alias"
            name="customAlias"
            placeholder="my-alias"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            error={aliasError}
            hint={aliasError ? undefined : 'Letters, numbers, hyphens and underscores (max 32).'}
            maxLength={ALIAS_MAX_LENGTH}
          />
        ) : null}

        {result ? (
          <div className="animate-fade-in border border-border bg-muted/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Your short link is ready
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate font-mono text-sm text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {result.shortUrl}
              </a>
              <div className="flex gap-2">
                <CopyButton value={result.shortUrl} />
                <Button variant="secondary" size="sm" onClick={() => setShowQr((value) => !value)}>
                  <QrCode className="h-4 w-4" />
                  {showQr ? 'Hide QR' : 'QR'}
                </Button>
                <a href={result.shortUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Button>
                </a>
              </div>
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">→ {result.longUrl}</p>
            {showQr ? (
              <div className="mt-4">
                <QrPanel value={result.shortUrl} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
