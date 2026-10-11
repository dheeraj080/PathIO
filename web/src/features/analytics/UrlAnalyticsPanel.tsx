import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, ExternalLink } from 'lucide-react'
import { getClickBreakdown, getClickHistory, getUrlAnalytics } from '@/api/analytics.api'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { AnalyticsCard } from '@/components/analytics/AnalyticsCard'
import { HistoryChart } from '@/components/charts/HistoryChart'
import { BreakdownBars } from '@/components/charts/BreakdownBars'
import { ComparisonBadge } from '@/features/analytics/ComparisonBadge'
import { getErrorMessage } from '@/lib/errors'
import { displayUrl, formatCount } from '@/lib/format'

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]

const RANGE_TABS = RANGES.map((value) => ({ label: `${value}d`, value: String(value) }))

/** History is fetched for the current period plus the previous one, so the badge can compare. */
const COMPARISON_PERIODS = 2

function totalClicksOf(points: { clicks: number }[]): number {
  return points.reduce((total, point) => total + point.clicks, 0)
}

interface UrlAnalyticsPanelProps {
  shortCode: string
}

export function UrlAnalyticsPanel({ shortCode }: UrlAnalyticsPanelProps) {
  const [range, setRange] = useState<Range>(30)

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

  const historyPoints = history.data ?? []
  const chartData = historyPoints.slice(-range)
  const previousPoints = historyPoints.slice(0, Math.max(0, historyPoints.length - range))
  const currentPeriodClicks = totalClicksOf(chartData)
  const previousPeriodClicks = history.isSuccess ? totalClicksOf(previousPoints) : null

  if (summary.isError) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-6" />}
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
    <div className="flex flex-col gap-4">
      {summary.data ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-[0.5px] border-border bg-card p-5 sm:p-6">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-foreground">
              /{summary.data.shortCode}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground" title={summary.data.longUrl}>
              {displayUrl(summary.data.longUrl, 70)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <CopyButton value={summary.data.shortUrl} />
            <a href={summary.data.shortUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm">
                <ExternalLink className="size-4" />
                Open
              </Button>
            </a>
          </div>
        </div>
      ) : null}

      <AnalyticsCard
        tabs={RANGE_TABS}
        activeTab={String(range)}
        onTabChange={(value) => setRange(Number(value) as Range)}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Total clicks
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
              {summary.isLoading
                ? 'Loading unique visitors…'
                : `${formatCount(summary.data?.uniqueClicks ?? 0)} unique visitors`}
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