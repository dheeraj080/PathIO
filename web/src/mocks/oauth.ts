import { API_ORIGIN } from '@/lib/config'
import type { OAuthSuccessPayload } from '@/types/api'
import { findUserByEmail, MOCK_USER_EMAIL } from '@/mocks/store'
import { issueToken, randomJti } from '@/mocks/token'

/** Dispatches the `postMessage` the OAuth popup would send on success. */
export function simulateOAuthSuccess(payload: OAuthSuccessPayload): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: API_ORIGIN,
      data: { type: 'OAUTH_AUTH_SUCCESS', payload },
    }),
  )
}

/** Dispatches an unrelated message; the app should ignore it (no success). */
export function simulateOAuthFailure(): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      origin: API_ORIGIN,
      data: { type: 'OAUTH_AUTH_FAILURE' },
    }),
  )
}

/** Builds a valid OAuth success payload for a seeded mock user. */
export function mockOAuthPayload(email: string = MOCK_USER_EMAIL): OAuthSuccessPayload {
  const user = findUserByEmail(email)
  if (!user) throw new Error(`No mock user with email ${email}`)
  return {
    accessToken: issueToken(user, 'access', 3600, randomJti()),
    expiresIn: 3600,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  }
}
