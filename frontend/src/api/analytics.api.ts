import { apiRequest } from '@/lib/api'
import type {
  AnalyticsOverviewResponse,
  ClickBreakdownResponse,
  ClickHistoryPoint,
  UrlAnalyticsResponse,
} from '@/types/api'

export function getOverview(): Promise<AnalyticsOverviewResponse> {
  return apiRequest<AnalyticsOverviewResponse>('/api/v1/analytics/overview')
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
