import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { API_BASE_URL } from '@/lib/config'
import { apiRequest } from '@/lib/api'
import { ApiError } from '@/lib/errors'
import { tokenStore } from '@/lib/tokenStore'
import { findUserByEmail, toUserDTO } from '@/mocks/store'
import { issueToken, randomJti } from '@/mocks/token'
import { accessTokenFor, MOCK_USER_EMAIL } from '@/mocks/fixtures'

const overviewUrl = `${API_BASE_URL}/api/v1/analytics/overview`

describe('apiRequest', () => {
  it('refreshes once for concurrent 401s (single-flight) and retries', async () => {
    const alice = findUserByEmail(MOCK_USER_EMAIL)!
    const refreshedToken = issueToken(alice, 'access', 3600, randomJti())
    let refreshCount = 0

    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/refresh`, () => {
        refreshCount += 1
        return HttpResponse.json({
          accessToken: refreshedToken,
          expiresIn: 3600,
          user: toUserDTO(alice),
        })
      }),
      http.get(overviewUrl, ({ request }) => {
        if (request.headers.get('Authorization') === `Bearer ${refreshedToken}`) {
          return HttpResponse.json({ totalUrls: 3, totalClicks: 7 })
        }
        return HttpResponse.json(
          { status: 401, error: 'Unauthorized', message: 'expired' },
          { status: 401 },
        )
      }),
    )

    tokenStore.set('stale-token')
    const [first, second] = await Promise.all([
      apiRequest<{ totalUrls: number; totalClicks: number }>('/api/v1/analytics/overview'),
      apiRequest<{ totalUrls: number; totalClicks: number }>('/api/v1/analytics/overview'),
    ])

    expect(refreshCount).toBe(1)
    expect(first.totalUrls).toBe(3)
    expect(second.totalClicks).toBe(7)
  })

  it('throws the original 401 and clears the token when refresh fails', async () => {
    tokenStore.set('stale-token')
    // No refresh cookie is set, so the default handler returns 401.
    await expect(apiRequest('/api/v1/analytics/overview')).rejects.toBeInstanceOf(ApiError)
    expect(tokenStore.get()).toBeNull()
  })

  it('normalizes the rate-limiter shape ({error,message}) on 429', async () => {
    server.use(
      http.get(overviewUrl, () =>
        HttpResponse.json(
          { error: 'Too many requests', message: 'Rate limit exceeded. Please try again later.' },
          { status: 429 },
        ),
      ),
    )
    tokenStore.set(accessTokenFor())

    const error = await apiRequest('/api/v1/analytics/overview').catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(429)
    expect((error as ApiError).isRateLimited).toBe(true)
  })

  it('normalizes the unified ApiError shape', async () => {
    server.use(
      http.get(overviewUrl, () =>
        HttpResponse.json(
          { status: 404, error: 'Not Found', message: 'nope', path: '/x', timestamp: 't' },
          { status: 404 },
        ),
      ),
    )
    tokenStore.set(accessTokenFor())

    const error = await apiRequest('/api/v1/analytics/overview').catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).message).toBe('nope')
  })
})
