import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useInView } from '@/lib/motion'

/**
 * One label + thin proportional bar + value/percentage row, shared by the
 * referrer and device breakdowns. The bar grows in on first view and is
 * disabled under `prefers-reduced-motion` via the global override.
 */
export function DataRow({
  label,
  value,
  percent,
  fraction,
  highlight = false,
  muted = false,
  delay = 0,
}: {
  label: ReactNode
  value: ReactNode
  percent?: string
  fraction: number
  highlight?: boolean
  muted?: boolean
  delay?: number
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  const width = `${Math.min(Math.max(fraction, 0), 1) * 100}%`

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span
          className={cn(
            'min-w-0 truncate',
            muted ? 'italic text-muted-foreground' : 'text-foreground',
          )}
        >
          {label}
        </span>
        <span className="flex shrink-0 items-baseline gap-2">
          <span className="tnum font-medium text-foreground">{value}</span>
          {percent ? (
            <span className="tnum w-9 text-right text-xs text-muted-foreground">{percent}</span>
          ) : null}
        </span>
      </div>
      <div className="mt-2 h-0.5 w-full overflow-hidden bg-border">
        <div
          className={cn(
            'bar-grow-x h-full',
            highlight ? 'bg-primary' : muted ? 'bg-foreground/20' : 'bg-foreground/45',
            inView && 'is-inview',
          )}
          style={{ width, '--bar-delay': `${delay}ms` } as CSSProperties}
        />
      </div>
    </div>
  )
}
