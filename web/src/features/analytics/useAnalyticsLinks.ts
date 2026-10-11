import { useQuery } from '@tanstack/react-query'
import { getMyUrls } from '@/api/urls.api'

/** Number of most-recent links loaded for the analytics link picker. */
const ANALYTICS_PICKER_LIMIT = 100

/** The user's most recent links, fetched once and shared by the analytics page and picker. */
export function useAnalyticsLinks() {
  return useQuery({
    queryKey: ['analytics', 'links', ANALYTICS_PICKER_LIMIT],
    queryFn: () => getMyUrls(0, ANALYTICS_PICKER_LIMIT),
  })
}