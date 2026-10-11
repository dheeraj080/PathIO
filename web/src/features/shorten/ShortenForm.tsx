import { useEffect, useState, type FormEvent, type Ref } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ExternalLink, QrCode, Sparkles, Wand2 } from 'lucide-react'
import { CREATE_LINK_EVENT } from '@/lib/events'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
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
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Shorten a URL
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create short, trackable links with click analytics, referrers and device breakdowns.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-xl border border-border bg-background p-2 sm:flex-row sm:items-center"
        >
          <div className="flex-1">
            <Input
              ref={inputRef}
              aria-label="Long URL"
              placeholder="Paste a long URL, e.g. https://example.com/very/long/path"
              value={longUrl}
              onChange={(event) => setLongUrl(event.target.value)}
              onBlur={() => setTouched(true)}
              error={urlError}
              className="border-transparent"
            />
          </div>
          <Button type="submit" size="lg" loading={isPending} className="sm:w-auto">
            Shorten URL
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setShowAlias((value) => !value)}
            aria-expanded={showAlias}
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
          >
            <Wand2 className="h-4 w-4" />
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
            hint={
              aliasError ? undefined : `Letters, numbers, hyphens and underscores (max 32).`
            }
            maxLength={ALIAS_MAX_LENGTH}
          />
        ) : null}

        {result ? (
          <div className="animate-fade-in rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Your short link is ready
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate font-mono text-sm text-primary underline-offset-2 hover:underline"
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
    </Card>
  )
}