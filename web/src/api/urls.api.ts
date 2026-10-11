import { apiRequest } from '@/lib/api'
import type { Page, ShortenUrlResponse, UserUrlResponse } from '@/types/api'

/** Create a short link. Requires authentication (OAuth user). */
export function shorten(longUrl: string, customAlias?: string): Promise<ShortenUrlResponse> {
  return apiRequest<ShortenUrlResponse>('/api/v1/shorten', {
    method: 'POST',
    body: { longUrl, customAlias: customAlias?.trim() ? customAlias.trim() : undefined },
  })
}

/** Paginated list of the current user's links. */
export function getMyUrls(page = 0, size = 20): Promise<Page<UserUrlResponse>> {
  return apiRequest<Page<UserUrlResponse>>(`/api/v1/urls/me?page=${page}&size=${size}`)
}

export function updateUrl(shortCode: string, longUrl: string): Promise<UserUrlResponse> {
  return apiRequest<UserUrlResponse>(`/api/v1/urls/${encodeURIComponent(shortCode)}`, {
    method: 'PUT',
    body: { longUrl },
  })
}

export function deleteUrl(shortCode: string): Promise<void> {
  return apiRequest<void>(`/api/v1/urls/${encodeURIComponent(shortCode)}`, {
    method: 'DELETE',
  })
}
