import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

const PERCENTAGE_MULTIPLIER = 100

interface ComparisonBadgeProps {
  totalClicks: number
  previousTotalClicks: number | null
  days: number
}

/**
 * Change vs the previous N days. Direction is carried by the arrow glyph and the
 * signed value (and by an accessible label), never by colour alone — the whole
 * line stays in muted ink.
 */
export function ComparisonBadge({
  totalClicks,
  previousTotalClicks,
  days,
}: ComparisonBadgeProps) {
  if (previousTotalClicks === null) return null

  let percent: number
  let direction: 'up' | 'down' | 'flat'

  if (previousTotalClicks === 0) {
    percent = totalClicks > 0 ? PERCENTAGE_MULTIPLIER : 0
    direction = totalClicks > 0 ? 'up' : 'flat'
  } else {
    percent = ((totalClicks - previousTotalClicks) / previousTotalClicks) * PERCENTAGE_MULTIPLIER
    direction = percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat'
  }

  const formattedPercent = (percent > 0 ? '+' : '') + `${percent.toFixed(1)}%`
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="tnum font-medium text-foreground">{formattedPercent}</span>
      <span className="whitespace-nowrap">vs previous {days} days</span>
    </p>
  )
}
