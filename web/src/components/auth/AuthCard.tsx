import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/Spinner'

/** Surface shared by the login and signup cards for consistent spacing. */
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8',
        'dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AuthHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
}) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
  )
}

/** Card-sized session-restoration state so the auth pages do not shift layout. */
export function AuthLoading({ label = 'Restoring your session…' }: { label?: string }) {
  return (
    <AuthCard>
      <div role="status" className="flex items-center gap-3">
        <Spinner className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      </div>
    </AuthCard>
  )
}
