import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatCount } from '@/lib/format'

export interface StatItem {
  label: string
  value: number | undefined
  detail?: ReactNode
  loading?: boolean
}

/**
 * Hairline cell rules: two columns on small screens, a single row of four on
 * larger ones. Only the outer edges carry a rule; the gaps between cells do too.
 */
function cellClass(index: number, total: number): string {
  const isFirstColumn = index % 2 === 0
  return cn(
    'relative py-6',
    isFirstColumn ? 'pr-4' : 'border-l border-border pl-4 pr-4',
    index < 2 && 'border-b border-border',
    'sm:border-b-0 sm:border-l sm:border-border sm:pl-6 sm:pr-6',
    index === 0 && 'sm:border-l-0 sm:pl-0',
    index === total - 1 && 'sm:pr-0',
  )
}

/**
 * Dashboard summary strip: four summary stats separated by thin rules with
 * oversized Fraunces numerals. No cards, no icon tiles.
 */
export function StatStrip({ stats, className }: { stats: StatItem[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 border-y border-border sm:grid-cols-4', className)}>
      {stats.map((stat, index) => (
        <div key={stat.label} className={cellClass(index, stats.length)}>
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {stat.label}
          </dt>
          <dd className="tnum mt-3 font-display text-[2rem] font-medium leading-none tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
            {stat.loading ? (
              <span className="inline-block h-8 w-16 animate-pulse rounded-sm bg-muted align-middle sm:h-10 sm:w-20" />
            ) : (
              formatCount(stat.value ?? 0)
            )}
          </dd>
          {stat.detail ? (
            <dd className="mt-3 max-w-full truncate text-xs text-muted-foreground">{stat.detail}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}
