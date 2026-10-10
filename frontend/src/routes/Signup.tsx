import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { ProviderButtons } from '@/components/auth/ProviderButtons'
import { FullPageLoading } from '@/components/auth/guards'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/auth/useAuth'
import { safeRedirect } from '@/lib/redirect'

const BENEFITS = [
  'Unlimited short links with custom aliases',
  'Click, referrer and device analytics',
  'Edit or delete any link you own',
  'No credit card, ready in seconds',
]

export function Signup() {
  const { status } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))

  if (status === 'loading') return <FullPageLoading />
  if (status === 'authenticated') return <Navigate to={redirect} replace />

  const afterAuth = () => {
    toast.push('Account created — welcome to PathIO', 'success')
    navigate(redirect, { replace: true })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Continue with a provider to get started. We&apos;ll set everything up on your first sign-in.
      </p>

      <div className="mt-6">
        <ProviderButtons
          onAuthenticated={afterAuth}
          googleLabel="Sign up with Google"
          githubLabel="Sign up with GitHub"
        />
      </div>

      <ul className="mt-6 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
        {BENEFITS.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Sign in
        </Link>
      </p>
    </div>
  )
}
