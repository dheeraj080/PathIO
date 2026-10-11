import { useQuery } from '@tanstack/react-query'
import { getClickHistory, getOverview } from '@/api/analytics.api'
import { getMyUrls } from '@/api/urls.api'
import type { UserUrlResponse } from '@/types/api'

/** The dashboard aggregates clicks over the same bounded window as the list. */
const DASHBOARD_WINDOW_SIZE = 100
const RECENT_DAYS = 7

/**
 * Sum of the last {@link RECENT_DAYS} days of clicks across the given links.
 * Links with no recorded clicks at all are skipped, since their recent
 * total is zero by definition — this avoids a history request per inert link.
 */
async function recentClicksTotal(links: UserUrlResponse[]): Promise<number> {
  const active = links.filter((link) => link.clickCount > 0)
  const series = await Promise.all(active.map((link) => getClickHistory(link.shortCode, RECENT_DAYS)))
  return series.reduce(
    (total, points) => total + points.reduce((sum, point) => sum + point.clicks, 0),
    0,
  )
}

function mostPopularLink(links: UserUrlResponse[]): UserUrlResponse | null {
  if (links.length === 0) return null
  return links.reduce((best, link) => (link.clickCount > best.clickCount ? link : best))
}

export interface DashboardAnalytics {
  totalUrls: number
  totalClicks: number
  recentClicks: number
  popular: UserUrlResponse | null
  windowSize: number
  totalElements: number
}

/**
 * Real-data analytics for the dashboard summary cards. Pulls the overview
 * totals plus a per-link aggregation over the recent-links window — no
 * fabricated percentages.
 */
export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async (): Promise<DashboardAnalytics> => {
      const [overview, page] = await Promise.all([
        getOverview(),
        getMyUrls(0, DASHBOARD_WINDOW_SIZE),
      ])
      const links = page.content
      const [recentClicks, popular] = await Promise.all([
        recentClicksTotal(links),
        Promise.resolve(mostPopularLink(links)),
      ])
      return {
        totalUrls: overview.totalUrls,
        totalClicks: overview.totalClicks,
        recentClicks,
        popular,
        windowSize: links.length,
        totalElements: page.totalElements,
      }
    },
  })
}