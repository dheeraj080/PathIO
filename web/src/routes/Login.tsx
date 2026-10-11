import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { AuthCard, AuthHeading, AuthLoading } from '@/components/auth/AuthCard'
import { ProviderButtons } from '@/components/auth/ProviderButtons'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessage } from '@/lib/errors'
import { safeRedirect } from '@/lib/redirect'
import { useDocumentMetadata } from '@/lib/useDocumentMetadata'

const ADMIN_ERROR_ID = 'admin-login-error'

export function Login() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useDocumentMetadata({
    title: 'Sign in — PathIO',
    description: 'Sign in to PathIO with Google or GitHub to create and manage short links.',
  })

  if (status === 'loading') return <AuthLoading />
  if (status === 'authenticated') return <Navigate to={redirect} replace />

  const afterAuth = () => {
    toast.push('Signed in successfully', 'success')
    navigate(redirect, { replace: true })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(email, password)
      afterAuth()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthCard>
      <AuthHeading
        eyebrow="Welcome back"
        title="Sign in to PathIO"
        description="Regular accounts use Google or GitHub — there is no separate password to remember."
      />

      <div className="mt-6">
        <ProviderButtons onAuthenticated={afterAuth} />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Administrator
          </span>
        </div>
      </div>

      <section
        aria-labelledby="admin-signin-heading"
        className="rounded-xl border border-border bg-muted/40 p-4"
      >
        <h2
          id="admin-signin-heading"
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <KeyRound className="h-3.5 w-3.5 shrink-0" />
          Administrator sign-in
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Reserved for the administrator account provisioned for this environment. Everyone else
          signs in with Google or GitHub above.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            required
            aria-describedby={error ? ADMIN_ERROR_ID : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            aria-describedby={error ? ADMIN_ERROR_ID : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? (
            <p id={ADMIN_ERROR_ID} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" loading={pending}>
            Sign in as administrator
          </Button>
        </form>
      </section>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to PathIO?{' '}
        <Link
          to={`/signup?redirect=${encodeURIComponent(redirect)}`}
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}
