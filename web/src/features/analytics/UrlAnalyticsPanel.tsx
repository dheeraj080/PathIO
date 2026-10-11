import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, ExternalLink, History, MousePointerClick, Users2 } from 'lucide-react'
import { getClickBreakdown, getClickHistory, getUrlAnalytics } from '@/api/analytics.api'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { HistoryChart } from '@/components/charts/HistoryChart'
import { BreakdownBars } from '@/components/charts/BreakdownBars'
import { getErrorMessage } from '@/lib/errors'
import { displayUrl, formatCount, formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]

function Metric({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: number | undefined
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <span className="text-brand-600 dark:text-brand-300">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-semibold tabular-nums">
          {loading ? <Spinner className="h-4 w-4" /> : formatCount(value ?? 0)}
        </p>
      </div>
    </div>
  )
}

export function UrlAnalyticsPanel({ shortCode }: { shortCode: string }) {
  const [range, setRange] = useState<Range>(30)

  const summary = useQuery({
    queryKey: ['analytics', 'url', shortCode],
    queryFn: () => getUrlAnalytics(shortCode),
    retry: false,
  })

  const history = useQuery({
    queryKey: ['analytics', 'url', shortCode, 'history', range],
    queryFn: () => getClickHistory(shortCode, range),
    retry: false,
  })

  const breakdown = useQuery({
    queryKey: ['analytics', 'url', shortCode, 'breakdown', range],
    queryFn: () => getClickBreakdown(shortCode, range),
    retry: false,
  })

  if (summary.isError) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-8 w-8" />}
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
    <div className="space-y-6">
      {summary.data ? (
        <Card>
          <CardHeader
            title={<span className="font-mono">/{summary.data.shortCode}</span>}
            description={displayUrl(summary.data.longUrl, 70)}
            action={
              <div className="flex gap-2">
                <CopyButton value={summary.data.shortUrl} />
                <a href={summary.data.shortUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Button>
                </a>
              </div>
            }
          />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                icon={<MousePointerClick className="h-5 w-5" />}
                label="Total clicks"
                value={summary.data.totalClicks}
                loading={summary.isLoading}
              />
              <Metric
                icon={<Users2 className="h-5 w-5" />}
                label="Unique clicks"
                value={summary.data.uniqueClicks}
                loading={summary.isLoading}
              />
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <span className="text-brand-600 dark:text-brand-300">
                  <History className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Created
                  </p>
                  <p className="text-sm font-medium">{formatDate(summary.data.createdAt)}</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Clicks over time"
          action={
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700">
              {RANGES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRange(value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    range === value
                      ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300',
                  )}
                >
                  {value}d
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          {history.isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : history.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{getErrorMessage(history.error)}</p>
          ) : history.data && history.data.length > 0 ? (
            <HistoryChart data={history.data} />
          ) : (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No clicks recorded in this period.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Referrers" action={<Badge tone="neutral">{range}d</Badge>} />
          <CardBody>
            {breakdown.isLoading ? (
              <Spinner className="h-5 w-5" />
            ) : breakdown.isError ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {getErrorMessage(breakdown.error)}
              </p>
            ) : (
              <BreakdownBars items={breakdown.data?.referrers ?? []} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Devices" action={<Badge tone="neutral">{range}d</Badge>} />
          <CardBody>
            {breakdown.isLoading ? (
              <Spinner className="h-5 w-5" />
            ) : breakdown.isError ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {getErrorMessage(breakdown.error)}
              </p>
            ) : (
              <BreakdownBars items={breakdown.data?.devices ?? []} />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
