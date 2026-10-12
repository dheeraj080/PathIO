import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface AnalyticsCardProps {
  /** Small mono caption above the section. Rendered as a paragraph, not a heading. */
  label?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Hairline section used by the analytics panels. Box-light by design: a single
 * rule and generous whitespace replace the old boxed card.
 */
export function AnalyticsCard({ label, children, className }: AnalyticsCardProps) {
  return (
    <section className={cn('border-t border-border pt-6', className)}>
      {label ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className={cn(label && 'mt-4')}>{children}</div>
    </section>
  )
}
