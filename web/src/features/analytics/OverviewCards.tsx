import { Link } from 'react-router-dom'
import { Link2, MousePointerClick, Timer, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useDashboardAnalytics } from '@/features/analytics/useDashboardAnalytics'
import { formatCount } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'

function StatCard({
  icon,
  label,
  value,
  loading,
  detail,
}: {
  icon: ReactNode
  label: string
  value: number | undefined
  loading: boolean
  detail?: ReactNode
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
            {loading ? <Spinner className="h-6 w-6" /> : formatCount(value ?? 0)}
          </p>
          {detail ? (
            <p className="mt-1 max-w-full truncate text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
    </Card>
  )
}

/**
 * Dashboard summary cards, built entirely from the global analytics endpoints
 * (overview totals, all-links 7-day rollup, top link).
 */
export function OverviewCards() {
  const { data, isLoading, isError, error } = useDashboardAnalytics()

  if (isError) {
    return (
      <Card className="p-5">
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={<Link2 className="size-4" />}
        label="Total links"
        value={data?.totalUrls}
        loading={isLoading}
        detail={`${data?.totalUrls ?? 0} in your account`}
      />
      <StatCard
        icon={<MousePointerClick className="size-4" />}
        label="Total clicks"
        value={data?.totalClicks}
        loading={isLoading}
        detail="All-time click count"
      />
      <StatCard
        icon={<Timer className="size-4" />}
        label="Clicks · last 7 days"
        value={data?.recentClicks}
        loading={isLoading}
        detail="Across all links"
      />
      <StatCard
        icon={<Trophy className="size-4" />}
        label="Most popular"
        value={data?.popular?.clickCount}
        loading={isLoading}
        detail={
          data?.popular ? (
            <Link
              to={`/links/${data.popular.shortCode}`}
              className="font-mono text-primary hover:underline"
              title={data.popular.longUrl}
            >
              /{data.popular.shortCode}
            </Link>
          ) : data ? (
            'No clicks yet'
          ) : undefined
        }
      />
    </div>
  )
}