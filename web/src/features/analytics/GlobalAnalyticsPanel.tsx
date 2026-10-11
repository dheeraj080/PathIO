import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGlobalBreakdown, getGlobalHistory } from '@/api/analytics.api'
import { AnalyticsCard } from '@/components/analytics/AnalyticsCard'
import { HistoryChart } from '@/components/charts/HistoryChart'
import { BreakdownBars } from '@/components/charts/BreakdownBars'
import { ComparisonBadge } from '@/features/analytics/ComparisonBadge'
import { Spinner } from '@/components/ui/Spinner'
import { getErrorMessage } from '@/lib/errors'

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]

const RANGE_TABS = RANGES.map((value) => ({ label: `${value}d`, value: String(value) }))

/** History is fetched for the current period plus the previous one, so the badge can compare. */
const COMPARISON_PERIODS = 2

function totalClicksOf(points: { clicks: number }[]): number {
  return points.reduce((total, point) => total + point.clicks, 0)
}

/**
 * All-links analytics: a combined click timeline plus referrer and device
 * breakdowns aggregated across every link the user owns.
 */
export function GlobalAnalyticsPanel() {
  const [range, setRange] = useState<Range>(30)

  const history = useQuery({
    queryKey: ['analytics', 'global', 'history', range * COMPARISON_PERIODS],
    queryFn: () => getGlobalHistory(range * COMPARISON_PERIODS),
  })

  const breakdown = useQuery({
    queryKey: ['analytics', 'global', 'breakdown', range],
    queryFn: () => getGlobalBreakdown(range),
  })

  const historyPoints = history.data ?? []
  const chartData = historyPoints.slice(-range)
  const previousPoints = historyPoints.slice(0, Math.max(0, historyPoints.length - range))
  const currentPeriodClicks = totalClicksOf(chartData)
  const previousPeriodClicks = history.isSuccess ? totalClicksOf(previousPoints) : null

  return (
    <div className="flex flex-col gap-4">
      <AnalyticsCard
        tabs={RANGE_TABS}
        activeTab={String(range)}
        onTabChange={(value) => setRange(Number(value) as Range)}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Total clicks · all links
            </p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground sm:text-4xl">
              {history.isLoading ? (
                <Spinner className="h-7 w-7" />
              ) : history.isError ? (
                '—'
              ) : (
                currentPeriodClicks.toLocaleString()
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Combined across every short link in your account.
            </p>
          </div>
          <ComparisonBadge
            totalClicks={currentPeriodClicks}
            previousTotalClicks={previousPeriodClicks}
            days={range}
          />
        </div>

        <div className="mt-6 h-64">
          {history.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : history.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(history.error)}</p>
          ) : chartData.length > 0 ? (
            <HistoryChart data={chartData} />
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No clicks recorded in this period.
            </p>
          )}
        </div>
      </AnalyticsCard>

      <div className="grid gap-4 md:grid-cols-2">
        <AnalyticsCard title="Referrers">
          {breakdown.isLoading ? (
            <Spinner className="h-5 w-5" />
          ) : breakdown.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(breakdown.error)}</p>
          ) : (
            <BreakdownBars items={breakdown.data?.referrers ?? []} emptyLabel="No referrers yet." />
          )}
        </AnalyticsCard>

        <AnalyticsCard title="Devices">
          {breakdown.isLoading ? (
            <Spinner className="h-5 w-5" />
          ) : breakdown.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(breakdown.error)}</p>
          ) : (
            <BreakdownBars items={breakdown.data?.devices ?? []} emptyLabel="No devices yet." />
          )}
        </AnalyticsCard>
      </div>
    </div>
  )
}