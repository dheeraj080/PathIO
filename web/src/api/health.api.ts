import { apiRequest } from '@/lib/api'
import type { HealthResponse } from '@/types/api'

/** Public health probe. */
export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/actuator/health', { auth: false, skipRefresh: true })
}
