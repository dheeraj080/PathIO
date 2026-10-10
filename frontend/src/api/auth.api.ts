import { apiRequest } from '@/lib/api'
import { API_BASE_URL } from '@/lib/config'
import type { TokenResponse } from '@/types/api'

export type OAuthProvider = 'google' | 'github'

/** Admin-only email/password login. Non-admins receive a 403 `OAUTH_ONLY`. */
export function login(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
    skipRefresh: true,
  })
}

/** Rotates the refresh token using the HttpOnly cookie and returns a new session. */
export function refresh(): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    body: {},
    auth: false,
    skipRefresh: true,
  })
}

export function logout(): Promise<void> {
  return apiRequest<void>('/api/v1/auth/logout', {
    method: 'POST',
    body: {},
    auth: false,
    skipRefresh: true,
  })
}

/** URL to open in the OAuth popup. */
export function oauthAuthorizationUrl(provider: OAuthProvider): string {
  return `${API_BASE_URL}/oauth2/authorization/${provider}`
}
