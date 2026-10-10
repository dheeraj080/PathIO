import { http, HttpResponse } from 'msw'
import { API_BASE_URL } from '@/lib/config'
import type { TokenResponse } from '@/types/api'
import {
  adminDeleteLink,
  authenticateAdmin,
  createLink,
  createUser,
  deleteOwnedLink,
  deleteUserRecord,
  findLink,
  findUserById,
  getClickBreakdown,
  getClickHistory,
  getOverview,
  getUrlAnalytics,
  listAllLinks,
  listOwnedLinks,
  listUsers,
  loginOrRegisterOAuth,
  MockHttpError,
  consumeRefreshToken,
  registerRefreshToken,
  resetMockData,
  revokeRefreshToken,
  toUserDTO,
  toUserUrlResponse,
  updateOwnedLink,
  updateUserProfile,
  pageOf,
  MOCK_SHORT_DOMAIN,
  type MockUser,
} from '@/mocks/store'
import { decodeToken, issueToken, randomJti } from '@/mocks/token'

const ACCESS_TTL = 3600
const REFRESH_TTL = 2592000

const u = (path: string) => `${API_BASE_URL}${path}`

function errorResponse(error: unknown): Response {
  if (error instanceof MockHttpError) {
    return HttpResponse.json(
      {
        status: error.status,
        error: error.code,
        message: error.message,
        path: '',
        timestamp: new Date().toISOString(),
      },
      { status: error.status },
    )
  }
  return HttpResponse.json(
    {
      status: 500,
      error: 'Internal Server Error',
      message: 'Unexpected mock server error',
      path: '',
      timestamp: new Date().toISOString(),
    },
    { status: 500 },
  )
}

function setRefreshCookie(token: string): void {
  if (typeof document !== 'undefined') {
    document.cookie = `refresh_token=${encodeURIComponent(token)}; path=/`
  }
}

function getRefreshCookie(): string | null {
  if (typeof document === 'undefined') return null
  const entry = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('refresh_token='))
  return entry ? decodeURIComponent(entry.slice('refresh_token='.length)) : null
}

function clearRefreshCookie(): void {
  if (typeof document !== 'undefined') {
    document.cookie = 'refresh_token=; path=/; max-age=0'
  }
}

function issueSession(user: MockUser): TokenResponse {
  const refreshJti = randomJti()
  registerRefreshToken(refreshJti, user.id)
  return {
    accessToken: issueToken(user, 'access', ACCESS_TTL, randomJti()),
    refreshToken: issueToken(user, 'refresh', REFRESH_TTL, refreshJti),
    expiresIn: ACCESS_TTL,
    tokenType: 'Bearer',
    user: toUserDTO(user),
  }
}

function requireUser(request: Request): MockUser {
  const header = request.headers.get('Authorization') ?? ''
  if (!header.startsWith('Bearer ')) {
    throw new MockHttpError(401, 'Unauthorized', 'Full authentication is required to access this resource')
  }
  const claims = decodeToken(header.slice('Bearer '.length))
  if (!claims || claims.typ !== 'access' || claims.exp * 1000 < Date.now()) {
    throw new MockHttpError(401, 'Unauthorized', 'Invalid or expired token')
  }
  const user = findUserById(claims.sub)
  if (!user) {
    throw new MockHttpError(401, 'Unauthorized', 'Authenticated user no longer exists')
  }
  return user
}

function requireAdmin(request: Request): MockUser {
  const user = requireUser(request)
  if (!user.roles.includes('ROLE_ADMIN')) {
    throw new MockHttpError(403, 'Forbidden', 'Access is denied')
  }
  return user
}

function pageParams(request: Request): { page: number; size: number } {
  const params = new URL(request.url).searchParams
  const page = Number.parseInt(params.get('page') ?? '0', 10)
  const size = Number.parseInt(params.get('size') ?? '20', 10)
  return {
    page: Number.isNaN(page) ? 0 : page,
    size: Number.isNaN(size) ? 20 : size,
  }
}

export const handlers = [
  // --- ops ---------------------------------------------------------------
  http.get(u('/actuator/health'), () => HttpResponse.json({ status: 'UP' })),

  // --- auth --------------------------------------------------------------
  http.post(u('/api/v1/auth/login'), async ({ request }) => {
    try {
      const body = (await request.json()) as { email?: string; password?: string }
      const user = authenticateAdmin(body.email ?? '', body.password ?? '')
      const response = issueSession(user)
      setRefreshCookie(response.refreshToken)
      return HttpResponse.json(response)
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.post(u('/api/v1/auth/refresh'), () => {
    try {
      const cookie = getRefreshCookie()
      if (!cookie) {
        throw new MockHttpError(401, 'Unauthorized', 'Refresh Token not found')
      }
      const claims = decodeToken(cookie)
      if (!claims || claims.typ !== 'refresh') {
        throw new MockHttpError(401, 'Unauthorized', 'Refresh token not recognized')
      }
      const userId = consumeRefreshToken(claims.jti)
      const user = findUserById(userId)
      if (!user) throw new MockHttpError(401, 'Unauthorized', 'Refresh token not recognized')
      const response = issueSession(user)
      setRefreshCookie(response.refreshToken)
      return HttpResponse.json(response)
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.post(u('/api/v1/auth/logout'), () => {
    const cookie = getRefreshCookie()
    if (cookie) {
      const claims = decodeToken(cookie)
      if (claims) revokeRefreshToken(claims.jti)
    }
    clearRefreshCookie()
    return new HttpResponse(null, { status: 204 })
  }),

  // --- users -------------------------------------------------------------
  http.get(u('/api/v1/users'), ({ request }) => {
    try {
      requireAdmin(request)
      return HttpResponse.json(listUsers().map(toUserDTO))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.post(u('/api/v1/users'), async ({ request }) => {
    try {
      requireAdmin(request)
      const body = (await request.json()) as { name?: string; email: string; password: string }
      const user = createUser(body)
      return HttpResponse.json(toUserDTO(user), { status: 201 })
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.get(u('/api/v1/users/:userId'), ({ request, params }) => {
    try {
      const user = requireUser(request)
      const targetId = String(params.userId)
      if (!user.roles.includes('ROLE_ADMIN') && user.id !== targetId) {
        throw new MockHttpError(403, 'Forbidden', 'Access is denied')
      }
      const target = findUserById(targetId)
      if (!target) throw new MockHttpError(404, 'Not Found', `User not found with ID: ${targetId}`)
      return HttpResponse.json(toUserDTO(target))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.put(u('/api/v1/users/:userId'), async ({ request, params }) => {
    try {
      const user = requireUser(request)
      const targetId = String(params.userId)
      if (!user.roles.includes('ROLE_ADMIN') && user.id !== targetId) {
        throw new MockHttpError(403, 'Forbidden', 'Access is denied')
      }
      const body = (await request.json()) as { name?: string; image?: string }
      return HttpResponse.json(toUserDTO(updateUserProfile(targetId, body)))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.delete(u('/api/v1/users/:userId'), ({ request, params }) => {
    try {
      const admin = requireAdmin(request)
      const targetId = String(params.userId)
      if (admin.id === targetId) {
        throw new MockHttpError(403, 'Forbidden', 'Admins cannot delete their own account')
      }
      deleteUserRecord(targetId)
      return new HttpResponse(null, { status: 204 })
    } catch (error) {
      return errorResponse(error)
    }
  }),

  // --- links -------------------------------------------------------------
  http.post(u('/api/v1/shorten'), async ({ request }) => {
    try {
      const user = requireUser(request)
      const body = (await request.json()) as { longUrl: string; customAlias?: string }
      const link = createLink(user.id, body.longUrl, body.customAlias)
      return HttpResponse.json(
        { shortUrl: `${MOCK_SHORT_DOMAIN}${link.shortCode}`, longUrl: link.longUrl },
        { status: 201 },
      )
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.get(u('/api/v1/urls/me'), ({ request }) => {
    try {
      const user = requireUser(request)
      const { page, size } = pageParams(request)
      const items = listOwnedLinks(user.id).map(toUserUrlResponse)
      return HttpResponse.json(pageOf(items, page, size))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.put(u('/api/v1/urls/:shortCode'), async ({ request, params }) => {
    try {
      const user = requireUser(request)
      const body = (await request.json()) as { longUrl: string }
      const link = updateOwnedLink(String(params.shortCode), user.id, body.longUrl)
      return HttpResponse.json(toUserUrlResponse(link))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.delete(u('/api/v1/urls/:shortCode'), ({ request, params }) => {
    try {
      const user = requireUser(request)
      deleteOwnedLink(String(params.shortCode), user.id)
      return new HttpResponse(null, { status: 204 })
    } catch (error) {
      return errorResponse(error)
    }
  }),

  // --- admin -------------------------------------------------------------
  http.get(u('/api/admin/urls'), ({ request }) => {
    try {
      requireAdmin(request)
      const { page, size } = pageParams(request)
      const items = listAllLinks().map(toUserUrlResponse)
      return HttpResponse.json(pageOf(items, page, size))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.delete(u('/api/admin/urls/:shortCode'), ({ request, params }) => {
    try {
      requireAdmin(request)
      adminDeleteLink(String(params.shortCode))
      return new HttpResponse(null, { status: 204 })
    } catch (error) {
      return errorResponse(error)
    }
  }),

  // --- analytics ---------------------------------------------------------
  http.get(u('/api/v1/analytics/overview'), ({ request }) => {
    try {
      const user = requireUser(request)
      return HttpResponse.json(getOverview(user.id))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.get(u('/api/v1/analytics/urls/:shortCode/history'), ({ request, params }) => {
    try {
      const user = requireUser(request)
      const days = Number.parseInt(new URL(request.url).searchParams.get('days') ?? '30', 10)
      return HttpResponse.json(getClickHistory(String(params.shortCode), user.id, days))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.get(u('/api/v1/analytics/urls/:shortCode/breakdown'), ({ request, params }) => {
    try {
      const user = requireUser(request)
      const days = Number.parseInt(new URL(request.url).searchParams.get('days') ?? '30', 10)
      return HttpResponse.json(getClickBreakdown(String(params.shortCode), user.id, days))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  http.get(u('/api/v1/analytics/urls/:shortCode'), ({ request, params }) => {
    try {
      const user = requireUser(request)
      return HttpResponse.json(getUrlAnalytics(String(params.shortCode), user.id))
    } catch (error) {
      return errorResponse(error)
    }
  }),

  // --- public redirect (last: single-segment catch-all) ------------------
  http.get(u('/api/v1/:shortCode'), ({ params }) => {
    const link = findLink(String(params.shortCode))
    if (!link) {
      return HttpResponse.json(
        { status: 404, error: 'Not Found', message: `URL not found for code: ${params.shortCode}` },
        { status: 404 },
      )
    }
    link.clickCount += 1
    return HttpResponse.redirect(link.longUrl, 302)
  }),
]

export { loginOrRegisterOAuth, issueSession, setRefreshCookie }
export { resetMockData }
