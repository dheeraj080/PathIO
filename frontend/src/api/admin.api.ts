import { apiRequest } from '@/lib/api'
import type { Page, UserUrlResponse } from '@/types/api'

/** Admin-only: paginated list of every short link. */
export function listAllUrls(page = 0, size = 20): Promise<Page<UserUrlResponse>> {
  return apiRequest<Page<UserUrlResponse>>(`/api/admin/urls?page=${page}&size=${size}`)
}

/** Admin-only: delete any short link. */
export function adminDeleteUrl(shortCode: string): Promise<void> {
  return apiRequest<void>(`/api/admin/urls/${encodeURIComponent(shortCode)}`, { method: 'DELETE' })
}
