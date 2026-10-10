// ---------------------------------------------------------------------------
// DTOs mirrored from the Spring backend (source of truth:
// src/main/java/com/pt/pathio/**/dto/*.java and controllers).
// ---------------------------------------------------------------------------

export interface RoleDTO {
  id: string
  name: string
}

export interface UserDTO {
  id: string
  name: string | null
  email: string
  image: string | null
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
  provider?: 'LOCAL' | 'GOOGLE' | 'GITHUB' | 'FACEBOOK'
  roles?: RoleDTO[]
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType?: string
  user: UserDTO
}

/** Payload delivered by the OAuth popup via `window.postMessage`. */
export interface OAuthSuccessPayload {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: Pick<UserDTO, 'id' | 'email' | 'name' | 'image'>
}

export interface ShortenUrlResponse {
  shortUrl: string
  longUrl: string
}

export interface UserUrlResponse {
  shortCode: string
  shortUrl: string
  longUrl: string
  clickCount: number
  createdAt: string
}

/** Spring Data `Page<T>` JSON envelope. */
export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  numberOfElements: number
  first: boolean
  last: boolean
  empty: boolean
}

export interface AnalyticsOverviewResponse {
  totalUrls: number
  totalClicks: number
}

export interface UrlAnalyticsResponse {
  shortCode: string
  shortUrl: string
  longUrl: string
  totalClicks: number
  uniqueClicks: number
  createdAt: string
}

export interface ClickHistoryPoint {
  date: string
  clicks: number
}

export interface DimensionCount {
  value: string
  clicks: number
}

export interface ClickBreakdownResponse {
  referrers: DimensionCount[]
  devices: DimensionCount[]
}

export interface HealthResponse {
  status: string
}

export interface ApiErrorPayload {
  status?: number
  error?: string
  message?: string
  path?: string
  timestamp?: string
}
