import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Small keyboard-hint chip used next to buttons and inside menus. */
export function Kbd({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1',
        'font-sans text-[10px] font-medium leading-none text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
