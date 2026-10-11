import { useQuery } from '@tanstack/react-query'
import { getGlobalHistory, getOverview, getTopLinks } from '@/api/analytics.api'
import type { TopLinkResponse } from '@/types/api'

const RECENT_DAYS = 7

export interface DashboardAnalytics {
  totalUrls: number
  totalClicks: number
  recentClicks: number
  popular: TopLinkResponse | null
}

/**
 * Real-data analytics for the dashboard summary cards, now backed by the
 * global analytics endpoints: totals from /overview, a 7-day sum from the
 * all-links history rollup, and the single most-clicked link from /top-links.
 * No client-side per-link fan-out, no fabricated percentages.
 */
export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async (): Promise<DashboardAnalytics> => {
      const [overview, recentSeries, top] = await Promise.all([
        getOverview(),
        getGlobalHistory(RECENT_DAYS),
        getTopLinks(1),
      ])
      const recentClicks = recentSeries.reduce((total, point) => total + point.clicks, 0)
      return {
        totalUrls: overview.totalUrls,
        totalClicks: overview.totalClicks,
        recentClicks,
        popular: top[0] ?? null,
      }
    },
  })
}