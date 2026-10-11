import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Centered empty/placeholder block with an icon chip and optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <span className="flex size-14 items-center justify-center rounded-2xl border-[0.5px] border-border bg-muted text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
