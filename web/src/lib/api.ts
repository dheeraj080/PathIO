import { API_BASE_URL } from './config'
import { toApiError } from './errors'
import { tokenStore } from './tokenStore'
import type { TokenResponse } from '@/types/api'

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Request body; plain objects are JSON-encoded automatically. */
  body?: unknown
  /** Attach the bearer token when available. Defaults to true. */
  auth?: boolean
  /** Do not attempt a silent refresh on 401 (used for auth endpoints). */
  skipRefresh?: boolean
}

let refreshPromise: Promise<boolean> | null = null

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!response.ok) return false
    const data = (await response.json()) as TokenResponse
    if (!data.accessToken) return false
    tokenStore.set(data.accessToken)
    return true
  } catch {
    return false
  }
}

/**
 * Silently refreshes the session from the HttpOnly cookie. Concurrent callers
 * share a single in-flight request (single-flight) so a burst of 401s triggers
 * exactly one refresh.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/**
 * Fetch wrapper: JSON body handling, bearer auth, `credentials: 'include'`,
 * single-flight 401 -> refresh -> retry, and normalized `ApiError`s.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, skipRefresh = false, headers, ...rest } = options
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`

  const doFetch = (): Promise<Response> => {
    const finalHeaders = new Headers(headers)
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
    if (body !== undefined && !isFormData && !finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json')
    }
    const token = tokenStore.get()
    if (auth && token) {
      finalHeaders.set('Authorization', `Bearer ${token}`)
    }
    return fetch(url, {
      ...rest,
      credentials: 'include',
      headers: finalHeaders,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    })
  }

  let response = await doFetch()

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await doFetch()
    } else {
      tokenStore.set(null)
    }
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }
  return (await response.text()) as unknown as T
}
