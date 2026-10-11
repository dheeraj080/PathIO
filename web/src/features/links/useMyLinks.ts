import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getMyUrls } from '@/api/urls.api'

/** Page size for the current user's link list (dashboard table + nudge). */
export const MY_LINKS_PAGE_SIZE = 10

/** Cache key for a page of the current user's links. */
export function myLinksQueryKey(page: number) {
  return ['urls', 'me', page, MY_LINKS_PAGE_SIZE] as const
}

/**
 * The current user's paginated links. Shared by the dashboard table and the
 * first-link nudge so both read the exact same cache entry and request.
 */
export function useMyLinks(page: number) {
  return useQuery({
    queryKey: myLinksQueryKey(page),
    queryFn: () => getMyUrls(page, MY_LINKS_PAGE_SIZE),
    placeholderData: keepPreviousData,
  })
}
