import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Spinner } from '@/components/ui/Spinner'

export function FullPageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-brand-600">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageLoading />
  if (status === 'anonymous') {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, isAdmin } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageLoading />
  if (status === 'anonymous') {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
