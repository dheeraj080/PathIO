import { TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

const PERCENTAGE_MULTIPLIER = 100

interface ComparisonBadgeProps {
  totalClicks: number
  previousTotalClicks: number | null
  days: number
}

/** Percent change vs the previous N days, mirroring the reference analytics badge. */
export function ComparisonBadge({
  totalClicks,
  previousTotalClicks,
  days,
}: ComparisonBadgeProps) {
  if (previousTotalClicks === null) return null

  let percent: number
  let isPositive: boolean

  if (previousTotalClicks === 0) {
    percent = totalClicks > 0 ? PERCENTAGE_MULTIPLIER : 0
    isPositive = totalClicks >= 0
  } else {
    percent = ((totalClicks - previousTotalClicks) / previousTotalClicks) * PERCENTAGE_MULTIPLIER
    isPositive = percent >= 0
  }

  const formattedPercent = (percent > 0 ? '+' : '') + `${percent.toFixed(1)}%`

  return (
    <div className="flex items-center gap-3">
      <Badge tone={isPositive ? 'success' : 'danger'} className="gap-1">
        {isPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        <span>{formattedPercent}</span>
      </Badge>
      <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
        vs last {days} days
      </span>
    </div>
  )
}