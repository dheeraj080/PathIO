import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/Spinner'

/** Surface shared by the login and signup cards for consistent spacing. */
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8',
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
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

/** Card-sized session-restoration state so the auth pages do not shift layout. */
export function AuthLoading({ label = 'Restoring your session…' }: { label?: string }) {
  return (
    <AuthCard>
      <div role="status" className="flex items-center gap-3">
        <Spinner className="h-5 w-5 text-primary" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </AuthCard>
  )
}
