import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'brand'

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  success:
    'border-green-700/20 bg-green-100 text-green-700 dark:border-green-300/20 dark:bg-green-950 dark:text-green-300',
  danger:
    'border-red-700/20 bg-red-100 text-red-700 dark:border-red-300/20 dark:bg-red-950 dark:text-red-300',
  warning:
    'border-yellow-700/20 bg-yellow-100 text-yellow-700 dark:border-yellow-300/20 dark:bg-yellow-950 dark:text-yellow-300',
  brand: 'border-primary/30 bg-primary/10 text-primary',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center justify-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
