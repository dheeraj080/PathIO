import {
  findUserByEmail,
  registerRefreshToken,
  MOCK_ADMIN_EMAIL,
  MOCK_ADMIN_PASSWORD,
  MOCK_SHORT_DOMAIN,
  MOCK_USER_EMAIL,
  MockHttpError,
  resetMockData,
} from '@/mocks/store'
import { issueToken, randomJti } from '@/mocks/token'

// Convenience re-exports for tests.
export {
  MOCK_ADMIN_EMAIL,
  MOCK_ADMIN_PASSWORD,
  MOCK_SHORT_DOMAIN,
  MOCK_USER_EMAIL,
  MockHttpError,
  resetMockData,
}

/** Creates a signed mock access token for a seeded user. */
export function accessTokenFor(email: string = MOCK_USER_EMAIL): string {
  const user = findUserByEmail(email)
  if (!user) throw new Error(`No mock user with email ${email}`)
  return issueToken(user, 'access', 3600, randomJti())
}

/**
 * Registers a refresh token and writes the refresh cookie, so that the
 * AuthProvider's boot-time `/auth/refresh` call restores a real session.
 */
export function signInAs(email: string = MOCK_USER_EMAIL): string {
  const user = findUserByEmail(email)
  if (!user) throw new Error(`No mock user with email ${email}`)
  const jti = randomJti()
  registerRefreshToken(jti, user.id)
  const refreshToken = issueToken(user, 'refresh', 2592000, jti)
  document.cookie = `refresh_token=${encodeURIComponent(refreshToken)}; path=/`
  return refreshToken
}
