import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { getOverview } from '@/api/analytics.api'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LinkCardSkeletonList } from '@/features/links/LinkCardSkeleton'
import { AnalyticsLinkPicker } from '@/features/analytics/AnalyticsLinkPicker'
import { UrlAnalyticsPanel } from '@/features/analytics/UrlAnalyticsPanel'
import { useAnalyticsLinks } from '@/features/analytics/useAnalyticsLinks'
import { getErrorMessage } from '@/lib/errors'
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

/** Top-level /analytics page: pick one link and inspect its clicks, referrers and devices. */
export function Analytics() {
  const { data, isLoading, isError, error } = useAnalyticsLinks()
  const [selected, setSelected] = useState<string | null>(null)

  const links = data?.content ?? []
  const selectedCode = selected ?? links[0]?.shortCode ?? null

  if (isLoading) {
    return (
      <PageContainer>
        <LinkCardSkeletonList />
      </PageContainer>
    )
  }

  if (isError) {
    return (
      <PageContainer>
        <Card className="p-6">
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        </Card>
      </PageContainer>
    )
  }

  if (!selectedCode) {
    return (
      <PageContainer>
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title="No links to analyze yet"
          description="Create a short link first — this page shows its clicks, referrers and devices."
          action={
            <Link to="/dashboard">
              <Button variant="secondary" size="sm">
                Create your first short link
              </Button>
            </Link>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <AnalyticsLinkPicker shortCode={selectedCode} onSelect={setSelected} />
        <OverviewLine />
      </div>
      <UrlAnalyticsPanel key={selectedCode} shortCode={selectedCode} />
    </PageContainer>
  )
}