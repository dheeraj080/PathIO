import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Page title used by the sticky dashboard header. */
export function PageHeading({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h1 className={cn('text-xl font-bold tracking-tight text-foreground sm:text-2xl', className)}>
      {children}
    </h1>
  )
}
