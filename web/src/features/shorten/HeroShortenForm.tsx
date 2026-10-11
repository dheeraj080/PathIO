import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, ExternalLink, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CopyButton } from '@/components/ui/CopyButton'
import { isValidHttpUrl } from '@/features/shorten/ShortenForm'
import { useShortenLink } from '@/features/shorten/useShortenLink'
import { useAuth } from '@/auth/useAuth'
import type { ShortenUrlResponse } from '@/types/api'

/** Best-effort short code from a short URL, used for the analytics link. */
function shortCodeOf(shortUrl: string): string | null {
  try {
    const code = new URL(shortUrl).pathname.replace(/^\/+/, '')
    return code || null
  } catch {
    return null
  }
}

/**
 * Builds the login URL that carries an intended destination through the existing
 * `redirect` mechanism, so the URL is prefilled once the visitor is signed in.
 * The value stays a same-origin path, which `safeRedirect` accepts.
 */
export function buildLoginRedirect(longUrl: string): string {
  const target = `/dashboard?prefill=${encodeURIComponent(longUrl)}`
  return `/login?redirect=${encodeURIComponent(target)}`
}

/**
 * Functional shortener used in the marketing hero.
 *
 * Anonymous visitors are sent through the existing login flow with their URL
 * preserved. Authenticated visitors reuse the shared shorten mutation.
 */
export function HeroShortenForm() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { mutate, isPending } = useShortenLink()
  const statusId = useId()

  const [longUrl, setLongUrl] = useState('')
  const [touched, setTouched] = useState(false)
  const [result, setResult] = useState<ShortenUrlResponse | null>(null)

  const error = touched && !isValidHttpUrl(longUrl.trim()) ? 'Enter a valid http(s) URL.' : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    const value = longUrl.trim()
    if (!isValidHttpUrl(value)) return

    if (!isAuthenticated) {
      // Hand the intent to the established auth flow; no link is created here.
      navigate(buildLoginRedirect(value))
      return
    }
    mutate(
      { longUrl: value },
      {
        onSuccess: (data) => {
          setResult(data)
          setLongUrl('')
          setTouched(false)
        },
      },
    )
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-2 shadow-soft sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <Input
            aria-label="Long URL"
            aria-describedby={error ? statusId : undefined}
            placeholder="Paste a long URL, e.g. https://example.com/very/long/path"
            value={longUrl}
            onChange={(event) => setLongUrl(event.target.value)}
            onBlur={() => setTouched(true)}
            className="border-transparent"
          />
        </div>
        <Button type="submit" size="lg" loading={isPending} className="sm:w-auto">
          Shorten URL
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div id={statusId} aria-live="polite" className="min-h-[1.25rem] text-sm">
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <p className="text-muted-foreground">
            {isAuthenticated
              ? 'Enter a destination URL and we will create the short link right away.'
              : 'Sign in with Google or GitHub to create the link — your URL is kept ready.'}
          </p>
        )}
      </div>

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
            <div className="flex flex-wrap gap-2">
              <CopyButton value={result.shortUrl} />
              <a href={result.shortUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </a>
              {shortCodeOf(result.shortUrl) ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/links/${shortCodeOf(result.shortUrl)}`)}
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
