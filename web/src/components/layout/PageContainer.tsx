import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Vertical rhythm wrapper shared by every dashboard page. */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('flex w-full flex-col gap-4 pb-12', className)}>{children}</div>
}
