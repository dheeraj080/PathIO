import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3, Link2, Pencil } from 'lucide-react'
import { AuthCard, AuthHeading, AuthLoading } from '@/components/auth/AuthCard'
import { ProviderButtons } from '@/components/auth/ProviderButtons'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/auth/useAuth'
import { safeRedirect } from '@/lib/redirect'
import { useDocumentMetadata } from '@/lib/useDocumentMetadata'

const BENEFITS = [
  { icon: Link2, text: 'Short links with optional custom aliases' },
  { icon: BarChart3, text: 'Total and unique clicks, history, referrers, devices' },
  { icon: Pencil, text: 'Edit, copy, or delete the links you own' },
]

export function Signup() {
  const { status } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const redirect = safeRedirect(params.get('redirect'))

  useDocumentMetadata({
    title: 'Create account — PathIO',
    description:
      'Create a PathIO account with Google or GitHub to start making short links with analytics.',
  })

  if (status === 'loading') return <AuthLoading />
  if (status === 'authenticated') return <Navigate to={redirect} replace />

  const afterAuth = () => {
    toast.push('Welcome to PathIO', 'success')
    navigate(redirect, { replace: true })
  }

  return (
    <AuthCard>
      <AuthHeading
        eyebrow="Get started"
        title="Create your PathIO account"
        description="Your account is created the first time you sign in with Google or GitHub. There is no separate password sign-up."
      />

      <div className="mt-6">
        <ProviderButtons
          onAuthenticated={afterAuth}
          googleLabel="Sign up with Google"
          githubLabel="Sign up with GitHub"
        />
      </div>

      <ul className="mt-6 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            </span>
            {text}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link
          to={`/login?redirect=${encodeURIComponent(redirect)}`}
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}