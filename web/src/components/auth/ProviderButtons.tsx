import { useState } from 'react'
import { Github } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/auth/useAuth'
import { ApiError, getErrorMessage } from '@/lib/errors'
import type { OAuthProvider } from '@/api/auth.api'

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

const PROVIDER_NAME: Record<OAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
}

/**
 * Google + GitHub sign-in buttons. Used by both the login and signup pages
 * (OAuth account creation happens on the provider's first successful sign-in).
 *
 * While a flow is running both buttons are locked so a second popup cannot be
 * opened. A blocked, closed, or rejected flow surfaces a recoverable message
 * and re-enables the buttons so the visitor can retry.
 */
export function ProviderButtons({
  onAuthenticated,
  disabled = false,
  googleLabel = 'Continue with Google',
  githubLabel = 'Continue with GitHub',
}: {
  onAuthenticated?: () => void
  disabled?: boolean
  googleLabel?: string
  githubLabel?: string
}) {
  const { loginWithProvider } = useAuth()
  const [pending, setPending] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorIsNotice, setErrorIsNotice] = useState(false)

  const handle = async (provider: OAuthProvider) => {
    if (pending) return
    setError(null)
    setErrorIsNotice(false)
    setPending(provider)
    try {
      await loginWithProvider(provider)
      onAuthenticated?.()
    } catch (err) {
      // A user-initiated cancellation is a notice, not a failure.
      setErrorIsNotice(err instanceof ApiError && err.code === 'OAUTH_CANCELLED')
      setError(getErrorMessage(err))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full justify-center"
        onClick={() => handle('google')}
        loading={pending === 'google'}
        disabled={disabled || (pending !== null && pending !== 'google')}
      >
        <GoogleIcon />
        {googleLabel}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full justify-center"
        onClick={() => handle('github')}
        loading={pending === 'github'}
        disabled={disabled || (pending !== null && pending !== 'github')}
      >
        <Github className="h-4 w-4" />
        {githubLabel}
      </Button>

      <p aria-live="polite" className="min-h-[1.25rem] text-sm">
        {pending ? (
          <span className="text-slate-500 dark:text-slate-400">
            Waiting for {PROVIDER_NAME[pending]} to finish. If no window appeared, allow popups for
            this site and try again.
          </span>
        ) : null}
      </p>

      {error ? (
        <p
          role="alert"
          className={
            errorIsNotice
              ? 'text-sm text-slate-600 dark:text-slate-300'
              : 'text-sm text-red-600 dark:text-red-400'
          }
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
