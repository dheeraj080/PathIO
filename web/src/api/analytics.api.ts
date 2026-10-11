import { apiRequest } from '@/lib/api'
import type {
  AnalyticsOverviewResponse,
  ClickBreakdownResponse,
  ClickHistoryPoint,
  TopLinkResponse,
  UrlAnalyticsResponse,
} from '@/types/api'

export function getOverview(): Promise<AnalyticsOverviewResponse> {
  return apiRequest<AnalyticsOverviewResponse>('/api/v1/analytics/overview')
}

export function getGlobalHistory(days = 30): Promise<ClickHistoryPoint[]> {
  return apiRequest<ClickHistoryPoint[]>(`/api/v1/analytics/history?days=${days}`)
}

export function getGlobalBreakdown(days = 30): Promise<ClickBreakdownResponse> {
  return apiRequest<ClickBreakdownResponse>(`/api/v1/analytics/breakdown?days=${days}`)
}

export function getTopLinks(limit = 5): Promise<TopLinkResponse[]> {
  return apiRequest<TopLinkResponse[]>(`/api/v1/analytics/top-links?limit=${limit}`)
}

export function getUrlAnalytics(shortCode: string): Promise<UrlAnalyticsResponse> {
  return apiRequest<UrlAnalyticsResponse>(`/api/v1/analytics/urls/${encodeURIComponent(shortCode)}`)
}

export function getClickHistory(shortCode: string, days = 30): Promise<ClickHistoryPoint[]> {
  return apiRequest<ClickHistoryPoint[]>(
    `/api/v1/analytics/urls/${encodeURIComponent(shortCode)}/history?days=${days}`,
  )
}

export function getClickBreakdown(shortCode: string, days = 30): Promise<ClickBreakdownResponse> {
  return apiRequest<ClickBreakdownResponse>(
    `/api/v1/analytics/urls/${encodeURIComponent(shortCode)}/breakdown?days=${days}`,
  )
}
