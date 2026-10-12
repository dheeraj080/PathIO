import { Link } from 'react-router-dom'
import { useDashboardAnalytics } from '@/features/analytics/useDashboardAnalytics'
import { StatStrip } from '@/components/ui/StatStrip'
import { getErrorMessage } from '@/lib/errors'

/**
 * Dashboard summary strip, built entirely from the global analytics endpoints
 * (overview totals, all-links 7-day rollup, top link). Rendered as a single
 * hairline-separated row of four oversized numerals — no cards, no icon tiles.
 */
export function OverviewCards() {
  const { data, isLoading, isError, error } = useDashboardAnalytics()

  if (isError) {
    return (
      <p className="border-y border-border py-6 text-sm text-destructive">
        {getErrorMessage(error)}
      </p>
    )
  }

  const popular = data?.popular

  return (
    <StatStrip
      stats={[
        {
          label: 'Total links',
          value: data?.totalUrls,
          loading: isLoading,
          detail: 'In your account',
        },
        {
          label: 'Total clicks',
          value: data?.totalClicks,
          loading: isLoading,
          detail: 'All-time',
        },
        {
          label: 'Clicks · last 7 days',
          value: data?.recentClicks,
          loading: isLoading,
          detail: 'Across all links',
        },
        {
          label: 'Most popular',
          value: popular?.clickCount,
          loading: isLoading,
          detail: popular ? (
            <Link
              to={`/links/${popular.shortCode}`}
              className="font-mono text-foreground underline-offset-4 hover:text-primary hover:underline"
              title={popular.longUrl}
            >
              /{popular.shortCode}
            </Link>
          ) : data ? (
            'No clicks yet'
          ) : undefined,
        },
      ]}
    />
  )
}
