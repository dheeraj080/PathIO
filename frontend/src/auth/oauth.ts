import { API_BASE_URL, API_ORIGIN } from '@/lib/config'
import { ApiError } from '@/lib/errors'
import type { OAuthSuccessPayload } from '@/types/api'

export interface OAuthResult extends OAuthSuccessPayload {}

interface OAuthMessage {
  type?: string
  payload?: OAuthSuccessPayload
  error?: string
}

/**
 * Opens the provider's OAuth popup and resolves with the token payload the
 * backend delivers via `window.opener.postMessage`.
 *
 * The backend only emits a success message; a popup that closes without one is
 * treated as a cancellation.
 */
export function startOAuth(provider: 'google' | 'github'): Promise<OAuthResult> {
  return new Promise<OAuthResult>((resolve, reject) => {
    const width = 520
    const height = 680
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)

    const popup = window.open(
      `${API_BASE_URL}/oauth2/authorization/${provider}`,
      'pathio-oauth',
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
    )

    if (!popup) {
      reject(
        new ApiError({
          status: 0,
          code: 'POPUP_BLOCKED',
          message: 'The sign-in popup was blocked. Please allow popups for this site and try again.',
        }),
      )
      return
    }

    let settled = false
    let pollId = 0

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      window.clearInterval(pollId)
    }

    const onMessage = (event: MessageEvent) => {
      // Only trust messages coming from the backend origin.
      if (event.origin !== API_ORIGIN) return
      const data = event.data as OAuthMessage | null
      if (!data) return

      if (data.type === 'OAUTH_AUTH_FAILURE') {
        settled = true
        cleanup()
        try {
          popup.close()
        } catch {
          // ignore
        }
        reject(
          new ApiError({
            status: 401,
            code: 'OAUTH_FAILED',
            message: data.error || 'Authentication failed.',
          }),
        )
        return
      }

      if (data.type !== 'OAUTH_AUTH_SUCCESS' || !data.payload?.accessToken) return

      settled = true
      cleanup()
      try {
        popup.close()
      } catch {
        // ignore
      }
      resolve(data.payload)
    }

    window.addEventListener('message', onMessage)

    pollId = window.setInterval(() => {
      if (!settled && popup.closed) {
        settled = true
        cleanup()
        reject(
          new ApiError({
            status: 0,
            code: 'OAUTH_CANCELLED',
            message: 'Sign-in was cancelled.',
          }),
        )
      }
    }, 400)
  })
}
