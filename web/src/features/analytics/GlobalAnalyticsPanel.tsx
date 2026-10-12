import { useQuery } from '@tanstack/react-query'
import { getGlobalBreakdown, getGlobalHistory } from '@/api/analytics.api'
import { AnalyticsCard } from '@/components/analytics/AnalyticsCard'
import { HistoryChart } from '@/components/charts/HistoryChart'
import { BreakdownBars } from '@/components/charts/BreakdownBars'
import { ComparisonBadge } from '@/features/analytics/ComparisonBadge'
import { CRAWLER_VALUES, deviceLabel, referrerLabel } from '@/features/analytics/labels'
import { buildDailySeries, sumClicks } from '@/features/analytics/series'
import { Spinner } from '@/components/ui/Spinner'
import { getErrorMessage } from '@/lib/errors'
import type { Range } from '@/features/analytics/ranges'

/** History is fetched for the current period plus the previous one, so the badge can compare. */
const COMPARISON_PERIODS = 2

function NoClicks() {
  return (
    <p className="flex h-56 items-center justify-center text-sm text-muted-foreground sm:h-64">
      No clicks in this period.
    </p>
  )
}

/**
 * All-links analytics: the current-period total, a click timeline, and referrer
 * and device breakdowns aggregated across every link the user owns. Missing days
 * are filled with zero so the line is always continuous.
 */
export function GlobalAnalyticsPanel({ range }: { range: Range }) {
  const history = useQuery({
    queryKey: ['analytics', 'global', 'history', range * COMPARISON_PERIODS],
    queryFn: () => getGlobalHistory(range * COMPARISON_PERIODS),
  })

  const breakdown = useQuery({
    queryKey: ['analytics', 'global', 'breakdown', range],
    queryFn: () => getGlobalBreakdown(range),
  })

  const series = history.data ? buildDailySeries(history.data, range * COMPARISON_PERIODS) : []
  const chartData = series.slice(-range)
  const previousPoints = series.slice(0, Math.max(0, series.length - range))
  const currentPeriodClicks = sumClicks(chartData)
  const previousPeriodClicks = history.isSuccess ? sumClicks(previousPoints) : null

  return (
    <div className="flex flex-col gap-10">
      <AnalyticsCard label="Total clicks · all links">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tnum font-display text-5xl font-medium leading-none tracking-[-0.02em] text-foreground sm:text-6xl">
              {history.isLoading ? (
                <Spinner className="h-8 w-8" />
              ) : history.isError ? (
                '—'
              ) : (
                currentPeriodClicks.toLocaleString()
              )}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Last {range} days</p>
          </div>
          <ComparisonBadge
            totalClicks={currentPeriodClicks}
            previousTotalClicks={previousPeriodClicks}
            days={range}
          />
        </div>

        <div className="mt-8">
          {history.isLoading ? (
            <div className="flex h-56 items-center justify-center sm:h-64">
              <Spinner className="h-6 w-6" />
            </div>
          ) : history.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(history.error)}</p>
          ) : currentPeriodClicks === 0 ? (
            <NoClicks />
          ) : (
            <HistoryChart data={chartData} />
          )}
        </div>
      </AnalyticsCard>

      <div className="grid gap-10 md:grid-cols-2">
        <AnalyticsCard label="Referrers">
          {breakdown.isLoading ? (
            <Spinner className="h-5 w-5" />
          ) : breakdown.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(breakdown.error)}</p>
          ) : (
            <BreakdownBars
              items={breakdown.data?.referrers ?? []}
              emptyLabel="No referrers yet."
              formatLabel={referrerLabel}
            />
          )}
        </AnalyticsCard>

        <AnalyticsCard label="Devices">
          {breakdown.isLoading ? (
            <Spinner className="h-5 w-5" />
          ) : breakdown.isError ? (
            <p className="text-sm text-destructive">{getErrorMessage(breakdown.error)}</p>
          ) : (
            <BreakdownBars
              items={breakdown.data?.devices ?? []}
              emptyLabel="No devices yet."
              formatLabel={deviceLabel}
              mutedValues={CRAWLER_VALUES}
            />
          )}
        </AnalyticsCard>
      </div>
    </div>
  )
}
