import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOverview } from '@/api/analytics.api'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { GlobalAnalyticsPanel } from '@/features/analytics/GlobalAnalyticsPanel'
import { TopLinksList } from '@/features/analytics/TopLinksList'
import { DEFAULT_RANGE, RANGE_OPTIONS, type Range } from '@/features/analytics/ranges'
import { formatCount } from '@/lib/format'

/** All-time account summary, so the period figure below is unambiguous. */
function OverviewLine() {
  const { data } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: getOverview,
  })
  if (!data) return null
  return (
    <p>
      <span className="tnum font-medium text-foreground">{formatCount(data.totalClicks)}</span>{' '}
      clicks all-time across{' '}
      <span className="tnum font-medium text-foreground">{formatCount(data.totalUrls)}</span>{' '}
      {data.totalUrls === 1 ? 'link' : 'links'}
    </p>
  )
}

/** Top-level /analytics page: all-links timeline, breakdowns and top links. */
export function Analytics() {
  const [range, setRange] = useState<Range>(DEFAULT_RANGE)

  return (
    <PageContainer className="gap-8">
      <PageHeader
        title="All links"
        description={<OverviewLine />}
        actions={
          <SegmentedControl
            ariaLabel="Period"
            options={RANGE_OPTIONS}
            value={String(range)}
            onChange={(value) => setRange(Number(value) as Range)}
          />
        }
      />
      <GlobalAnalyticsPanel range={range} />
      <TopLinksList />
    </PageContainer>
  )
}
