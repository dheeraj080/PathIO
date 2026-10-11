import { cn } from '@/lib/cn'

/** Pulsing placeholder used for component-level loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}
