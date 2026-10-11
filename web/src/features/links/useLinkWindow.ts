import { useQuery } from '@tanstack/react-query'
import { getMyUrls } from '@/api/urls.api'

/**
 * Bounded window of the user's most recent links. The backend has no
 * server-side search or sort, so the dashboard loads a single window and
 * filters/sorts/paginates it in memory. 100 rows covers a typical account
 * while keeping the payload reasonable.
 */
export const LINK_WINDOW_SIZE = 100

export function useLinkWindow() {
  return useQuery({
    queryKey: ['urls', 'me', 'window', LINK_WINDOW_SIZE],
    queryFn: () => getMyUrls(0, LINK_WINDOW_SIZE),
  })
}