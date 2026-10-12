import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, ExternalLink } from 'lucide-react'
import { getClickBreakdown, getClickHistory, getUrlAnalytics } from '@/api/analytics.api'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Spinner } from '@/components/ui/Spinner'
import { AnalyticsCard } from '@/components/analytics/AnalyticsCard'
import { HistoryChart } from '@/components/charts/HistoryChart'
import { BreakdownBars } from '@/components/charts/BreakdownBars'
import { ComparisonBadge } from '@/features/analytics/ComparisonBadge'
import { CRAWLER_VALUES, deviceLabel, referrerLabel } from '@/features/analytics/labels'
import { buildDailySeries, sumClicks } from '@/features/analytics/series'
import { DEFAULT_RANGE, RANGE_OPTIONS, type Range } from '@/features/analytics/ranges'
import { getErrorMessage } from '@/lib/errors'
import { displayUrl, formatCount } from '@/lib/format'

/** History is fetched for the current period plus the previous one, so the badge can compare. */
const COMPARISON_PERIODS = 2

interface UrlAnalyticsPanelProps {
  shortCode: string
}

export function UrlAnalyticsPanel({ shortCode }: UrlAnalyticsPanelProps) {
  const [range, setRange] = useState<Range>(DEFAULT_RANGE)

  const summary = useQuery({
    queryKey: ['analytics', 'url', shortCode],
    queryFn: () => getUrlAnalytics(shortCode),
    retry: false,
  })

  const history = useQuery({
    queryKey: ['analytics', 'url', shortCode, 'history', range],
    queryFn: () => getClickHistory(shortCode, range * COMPARISON_PERIODS),
    retry: false,
  })

  const breakdown = useQuery({
    queryKey: ['analytics', 'url', shortCode, 'breakdown', range],
    queryFn: () => getClickBreakdown(shortCode, range),
    retry: false,
  })

  const series = history.data ? buildDailySeries(history.data, range * COMPARISON_PERIODS) : []
  const chartData = series.slice(-range)
  const previousPoints = series.slice(0, Math.max(0, series.length - range))
  const currentPeriodClicks = sumClicks(chartData)
  const previousPeriodClicks = history.isSuccess ? sumClicks(previousPoints) : null

  if (summary.isError) {
    return (
      <EmptyState
        icon={<BarChart3 />}
        title="Analytics unavailable"
        description={getErrorMessage(summary.error)}
        action={
          <Link to="/dashboard">
            <Button variant="secondary" size="sm">
              Back to dashboard
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {summary.data ? (
            <>
              <p className="truncate font-mono text-2xl font-medium tracking-[-0.01em] text-foreground">
                /{summary.data.shortCode}
              </p>
              <p
                className="mt-1 truncate text-sm text-muted-foreground"
                title={summary.data.longUrl}
              >
                {displayUrl(summary.data.longUrl, 70)}
              </p>
            </>
          ) : (
            <div className="h-8 w-48 animate-pulse rounded-sm bg-muted" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summary.data ? (
            <>
              <CopyButton value={summary.data.shortUrl} />
              <a href={summary.data.shortUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">
                  <ExternalLink className="size-4" />
                  Open
                </Button>
              </a>
            </>
          ) : null}
          <SegmentedControl
            ariaLabel="Period"
            options={RANGE_OPTIONS}
            value={String(range)}
            onChange={(value) => setRange(Number(value) as Range)}
          />
        </div>
      </div>

      <AnalyticsCard label="Total clicks">
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
            <p className="mt-3 text-sm text-muted-foreground">
              Last {range} days ·{' '}
              {summary.isLoading
                ? 'loading unique visitors…'
                : `${formatCount(summary.data?.uniqueClicks ?? 0)} unique visitors`}
            </p>
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
            <p className="flex h-56 items-center justify-center text-sm text-muted-foreground sm:h-64">
              No clicks in this period.
            </p>
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
