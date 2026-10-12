import type { DimensionCount } from '@/types/api'
import { formatCount } from '@/lib/format'
import { DataRow } from '@/components/ui/DataRow'

/**
 * Ranked breakdown list: label, thin proportional bar, count and percentage.
 * The top row is the only one tinted with the accent; automated traffic can be
 * rendered in a muted, italic tone via `mutedValues`.
 */
export function BreakdownBars({
  items,
  emptyLabel = 'No data yet.',
  formatLabel,
  mutedValues,
}: {
  items: DimensionCount[]
  emptyLabel?: string
  formatLabel?: (value: string) => string
  mutedValues?: string[]
}) {
  if (!items.length) {
    return <p className="py-6 text-sm text-muted-foreground">{emptyLabel}</p>
  }

  const total = items.reduce((sum, item) => sum + item.clicks, 0) || 1
  const max = Math.max(1, ...items.map((item) => item.clicks))
  const muted = new Set(mutedValues ?? [])

  return (
    <ul className="divide-y divide-border">
      {items.map((item, index) => {
        const isMuted = muted.has(item.value)
        return (
          <li key={`${item.value}-${item.clicks}`} className="py-3 first:pt-0 last:pb-0">
            <DataRow
              label={formatLabel ? formatLabel(item.value) : item.value || 'Direct / unknown'}
              value={formatCount(item.clicks)}
              percent={`${Math.round((item.clicks / total) * 100)}%`}
              fraction={item.clicks / max}
              highlight={index === 0 && !isMuted}
              muted={isMuted}
              delay={index * 60}
            />
          </li>
        )
      })}
    </ul>
  )
}
