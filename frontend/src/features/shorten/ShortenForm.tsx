import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ExternalLink, QrCode, Sparkles, Wand2 } from 'lucide-react'
import { shorten } from '@/api/urls.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CopyButton } from '@/components/ui/CopyButton'
import { useToast } from '@/components/ui/Toast'
import { QrPanel } from '@/features/shorten/QrPanel'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessage } from '@/lib/errors'
import type { ShortenUrlResponse } from '@/types/api'

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function ShortenForm() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [longUrl, setLongUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [showAlias, setShowAlias] = useState(false)
  const [touched, setTouched] = useState(false)
  const [result, setResult] = useState<ShortenUrlResponse | null>(null)
  const [showQr, setShowQr] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: (vars: { longUrl: string; alias?: string }) => shorten(vars.longUrl, vars.alias),
    onSuccess: (data) => {
      setResult(data)
      setLongUrl('')
      setAlias('')
      setShowAlias(false)
      setShowQr(false)
      setTouched(false)
      toast.push('Short link created', 'success')
      void queryClient.invalidateQueries({ queryKey: ['urls', 'me'] })
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'overview'] })
    },
    onError: (error) => toast.push(getErrorMessage(error), 'error'),
  })

  const urlError = touched && !isValidHttpUrl(longUrl.trim()) ? 'Enter a valid http(s) URL.' : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    const value = longUrl.trim()
    if (!isValidHttpUrl(value)) return

    if (!isAuthenticated) {
      toast.push('Sign in to create your short link', 'info')
      navigate('/login?redirect=%2Fdashboard')
      return
    }
    mutate({ longUrl: value, alias: alias.trim() || undefined })
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex-1">
          <Input
            aria-label="Long URL"
            placeholder="Paste a long URL, e.g. https://example.com/very/long/path"
            value={longUrl}
            onChange={(event) => setLongUrl(event.target.value)}
            onBlur={() => setTouched(true)}
            error={urlError}
            className="border-transparent shadow-none focus:ring-0 dark:border-transparent"
          />
        </div>
        <Button type="submit" size="lg" loading={isPending} className="sm:w-auto">
          Shorten
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setShowAlias((value) => !value)}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-brand-600 dark:text-slate-400"
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
          hint="Letters, numbers, hyphens and underscores only (max 32)."
          maxLength={32}
        />
      ) : null}

      {result ? (
        <div className="animate-fade-in rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-950/40">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300">
            <Sparkles className="h-4 w-4" />
            Your short link is ready
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate font-mono text-sm text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
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
          <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
            → {result.longUrl}
          </p>
          {showQr ? (
            <div className="mt-4">
              <QrPanel value={result.shortUrl} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
