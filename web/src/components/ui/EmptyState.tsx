import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Centered empty/placeholder block. Icons are shown inline and muted rather than
 * inside a filled tile, matching the editorial, box-light direction.
 */
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
        'flex flex-col items-center justify-center gap-4 px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? <span className="text-muted-foreground/70 [&_svg]:size-6">{icon}</span> : null}
      <div className="flex flex-col gap-1">
        <p className="font-display text-xl font-medium tracking-[-0.01em] text-foreground">
          {title}
        </p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
