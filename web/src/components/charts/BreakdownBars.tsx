import type { DimensionCount } from '@/types/api'
import { formatCount } from '@/lib/format'

export function BreakdownBars({
  items,
  emptyLabel = 'No data yet.',
}: {
  items: DimensionCount[]
  emptyLabel?: string
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  const max = Math.max(1, ...items.map((item) => item.clicks))

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.value}-${item.clicks}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-foreground">
              {item.value || 'Direct / unknown'}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatCount(item.clicks)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-chart-clicks"
              style={{ width: `${(item.clicks / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
