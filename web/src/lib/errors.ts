import type { ApiErrorPayload } from '@/types/api'

interface ApiErrorInit {
  status: number
  code: string
  message: string
  path?: string
  timestamp?: string
}

/**
 * Normalized error for every failed API call. Handles both the unified
 * `ApiError { status, error, message, path, timestamp }` shape and the
 * rate-limiter's `{ error, message }` shape (which omits `status`).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly path?: string
  readonly timestamp?: string

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.path = init.path
    this.timestamp = init.timestamp
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isConflict(): boolean {
    return this.status === 409
  }

  get isValidation(): boolean {
    return this.status === 400
  }

  get isRateLimited(): boolean {
    return this.status === 429
  }

  /** Password login attempted by a non-admin account. */
  get isOAuthOnly(): boolean {
    return this.status === 403 && this.code === 'OAUTH_ONLY'
  }
}

/** Builds an `ApiError` from a failed `Response`, tolerating non-JSON bodies. */
export async function toApiError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload = {}
  const text = await response.text().catch(() => '')
  if (text) {
    try {
      payload = JSON.parse(text) as ApiErrorPayload
    } catch {
      payload = { message: text }
    }
  }

  return new ApiError({
    status: payload.status ?? response.status,
    code: payload.error ?? response.statusText ?? 'Error',
    message: payload.message ?? response.statusText ?? 'Request failed',
    path: payload.path,
    timestamp: payload.timestamp,
  })
}

/** Turns any thrown value into a user-presentable message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isOAuthOnly) {
      return 'Email/password sign-in is reserved for the administrator. Please continue with Google or GitHub.'
    }
    if (error.isRateLimited) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Something went wrong.'
}
