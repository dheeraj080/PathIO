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
  expiresIn: number
  tokenType?: string
  user: UserDTO
}

/** Payload delivered by the OAuth popup via `window.postMessage`. The refresh token is NOT
 *  part of this payload — it only ever travels in the HttpOnly cookie (SEC-02). */
export interface OAuthSuccessPayload {
  accessToken: string
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

/** Metadata for a programmatic-access key; the key digest is never exposed. */
export interface ApiKeyDTO {
  id: number
  name: string
  active: boolean
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
}

export interface CreateApiKeyRequest {
  name: string
  /** Validity window in days; null/omitted means the key never expires. */
  expiresInDays?: number | null
}

export interface CreateApiKeyResult {
  /** Plaintext API key — returned exactly once, at creation. */
  key: string
  apiKey: ApiKeyDTO
}
