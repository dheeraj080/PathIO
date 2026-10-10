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
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>
  }

  const max = Math.max(1, ...items.map((item) => item.clicks))

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.value}-${item.clicks}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-slate-700 dark:text-slate-200">
              {item.value || 'Direct / unknown'}
            </span>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">
              {formatCount(item.clicks)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${(item.clicks / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
