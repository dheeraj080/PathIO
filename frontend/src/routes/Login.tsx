import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { ProviderButtons } from '@/components/auth/ProviderButtons'
import { FullPageLoading } from '@/components/auth/guards'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessage } from '@/lib/errors'
import { safeRedirect } from '@/lib/redirect'

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

  if (status === 'loading') return <FullPageLoading />
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
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Sign in to create and manage your short links.
      </p>

      <div className="mt-6">
        <ProviderButtons onAuthenticated={afterAuth} />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        or
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Email/password sign-in is reserved for the environment-provisioned administrator.
        </p>
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full" loading={pending}>
          Sign in as administrator
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Sign up
        </Link>
      </p>
    </div>
  )
}
