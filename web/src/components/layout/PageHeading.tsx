import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Page title used by the sticky dashboard header (Fraunces display face). */
export function PageHeading({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h1
      className={cn(
        'font-display text-2xl font-medium leading-none tracking-[-0.02em] text-foreground sm:text-[1.75rem]',
        className,
      )}
    >
      {children}
    </h1>
  )
}
