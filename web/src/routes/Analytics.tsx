import { useQuery } from '@tanstack/react-query'
import { getOverview } from '@/api/analytics.api'
import { PageContainer } from '@/components/layout/PageContainer'
import { GlobalAnalyticsPanel } from '@/features/analytics/GlobalAnalyticsPanel'
import { TopLinksList } from '@/features/analytics/TopLinksList'
import { formatCount } from '@/lib/format'

/** Compact all-links summary from the shared /analytics/overview cache. */
function OverviewLine() {
  const { data } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: getOverview,
  })
  if (!data) return null
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-semibold tabular-nums">{formatCount(data.totalClicks)}</span> clicks
      across <span className="font-semibold tabular-nums">{formatCount(data.totalUrls)}</span> links
    </p>
  )
}

/** Top-level /analytics page: all-links timeline, breakdowns and top links. */
export function Analytics() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">All links</h2>
        <OverviewLine />
      </div>
      <GlobalAnalyticsPanel />
      <TopLinksList />
    </PageContainer>
  )
}