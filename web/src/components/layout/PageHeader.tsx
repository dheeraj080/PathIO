import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Editoral page header: an optional mono kicker, a large Fraunces title, a
 * one-line description and an optional right-aligned control. Sits on a single
 * hairline rule rather than inside a card.
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8',
        className,
      )}
    >
      <div className="min-w-0">
        {kicker ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {kicker}
          </p>
        ) : null}
        <h2
          className={cn(
            'font-display text-3xl font-medium leading-[1.05] tracking-[-0.02em] text-foreground sm:text-4xl',
            kicker && 'mt-2',
          )}
        >
          {title}
        </h2>
        {description ? (
          <div className="mt-3 text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}
