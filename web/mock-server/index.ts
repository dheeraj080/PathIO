import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { serve } from '@hono/node-server'
import {
  adminDeleteLink,
  authenticateAdmin,
  consumeRefreshToken,
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
  pageOf,
  registerRefreshToken,
  resetMockData,
  revokeRefreshToken,
  toUserDTO,
  toUserUrlResponse,
  updateOwnedLink,
  updateUserProfile,
  MOCK_ADMIN_EMAIL,
  MOCK_ADMIN_PASSWORD,
  MOCK_SHORT_DOMAIN,
  MOCK_USER_EMAIL,
  type MockUser,
} from '../src/mocks/store'
import { decodeToken, issueToken, randomJti } from '../src/mocks/token'
import type { TokenResponse } from '../src/types/api'

const PORT = Number(process.env.MOCK_PORT ?? 8081)
const ALLOWED_ORIGIN = process.env.MOCK_CORS_ORIGIN ?? 'http://localhost:5173'
const ACCESS_TTL = 3600
const REFRESH_TTL = 2592000
const COOKIE_NAME = 'refresh_token'

resetMockData()

const app = new Hono()

app.use(
  '*',
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.onError((error, c) => {
  if (error instanceof MockHttpError) {
    return c.json(
      {
        status: error.status,
        error: error.code,
        message: error.message,
        path: c.req.path,
        timestamp: new Date().toISOString(),
      },
      error.status as 400,
    )
  }
  console.error(error)
  return c.json(
    {
      status: 500,
      error: 'Internal Server Error',
      message: 'Unexpected mock server error',
      path: c.req.path,
      timestamp: new Date().toISOString(),
    },
    500,
  )
})

function issueSession(user: MockUser): TokenResponse & { refreshToken: string } {
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

function attachRefreshCookie(c: Parameters<typeof setCookie>[0], token: string): void {
  setCookie(c, COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: REFRESH_TTL,
  })
}

function requireUser(c: Parameters<typeof setCookie>[0]): MockUser {
  const header = c.req.header('Authorization') ?? ''
  if (!header.startsWith('Bearer ')) {
    throw new MockHttpError(401, 'Unauthorized', 'Full authentication is required to access this resource')
  }
  const claims = decodeToken(header.slice('Bearer '.length))
  if (!claims || claims.typ !== 'access' || claims.exp * 1000 < Date.now()) {
    throw new MockHttpError(401, 'Unauthorized', 'Invalid or expired token')
  }
  const user = findUserById(claims.sub)
  if (!user) throw new MockHttpError(401, 'Unauthorized', 'Authenticated user no longer exists')
  return user
}

function requireAdmin(c: Parameters<typeof setCookie>[0]): MockUser {
  const user = requireUser(c)
  if (!user.roles.includes('ROLE_ADMIN')) {
    throw new MockHttpError(403, 'Forbidden', 'Access is denied')
  }
  return user
}

function pageParams(c: Parameters<typeof setCookie>[0]): { page: number; size: number } {
  const page = Number.parseInt(c.req.query('page') ?? '0', 10)
  const size = Number.parseInt(c.req.query('size') ?? '20', 10)
  return { page: Number.isNaN(page) ? 0 : page, size: Number.isNaN(size) ? 20 : size }
}

// --- ops -------------------------------------------------------------------
app.get('/actuator/health', (c) => c.json({ status: 'UP' }))

// --- auth ------------------------------------------------------------------
app.post('/api/v1/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>()
  const user = authenticateAdmin(body.email ?? '', body.password ?? '')
  const session = issueSession(user)
  attachRefreshCookie(c, session.refreshToken)
  return c.json(session)
})

app.post('/api/v1/auth/refresh', (c) => {
  const cookie = getCookie(c, COOKIE_NAME)
  if (!cookie) throw new MockHttpError(401, 'Unauthorized', 'Refresh Token not found')
  const claims = decodeToken(cookie)
  if (!claims || claims.typ !== 'refresh') {
    throw new MockHttpError(401, 'Unauthorized', 'Refresh token not recognized')
  }
  const userId = consumeRefreshToken(claims.jti)
  const user = findUserById(userId)
  if (!user) throw new MockHttpError(401, 'Unauthorized', 'Refresh token not recognized')
  const session = issueSession(user)
  attachRefreshCookie(c, session.refreshToken)
  return c.json(session)
})

app.post('/api/v1/auth/logout', (c) => {
  const cookie = getCookie(c, COOKIE_NAME)
  if (cookie) {
    const claims = decodeToken(cookie)
    if (claims) revokeRefreshToken(claims.jti)
  }
  deleteCookie(c, COOKIE_NAME, { path: '/' })
  return c.body(null, 204)
})

// OAuth popup simulation: posts a success message back to the app and closes.
app.get('/oauth2/authorization/:provider', (c) => {
  const providerParam = c.req.param('provider')
  if (providerParam !== 'google' && providerParam !== 'github') {
    throw new MockHttpError(400, 'Bad Request', `Unknown provider: ${providerParam}`)
  }
  const provider = providerParam as 'google' | 'github'
  const user = provider === 'google' ? loginOrRegisterOAuth('google') : loginOrRegisterOAuth('github')
  const session = issueSession(user)
  attachRefreshCookie(c, session.refreshToken)

  const message = JSON.stringify({
    type: 'OAUTH_AUTH_SUCCESS',
    payload: {
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image ?? '',
      },
    },
  })

  const html = `<!DOCTYPE html><html><body><p>Signing you in…</p><script>
const message = ${message};
const origin = ${JSON.stringify(ALLOWED_ORIGIN)};
if (window.opener) { try { window.opener.postMessage(message, origin); } catch (e) {} }
window.close();
</script></body></html>`
  return c.html(html)
})

// --- users -----------------------------------------------------------------
app.get('/api/v1/users', (c) => {
  requireAdmin(c)
  return c.json(listUsers().map(toUserDTO))
})

app.post('/api/v1/users', async (c) => {
  requireAdmin(c)
  const body = await c.req.json<{ name?: string; email: string; password: string }>()
  const user = createUser(body)
  return c.json(toUserDTO(user), 201)
})

app.get('/api/v1/users/:userId', (c) => {
  const user = requireUser(c)
  const targetId = c.req.param('userId')
  if (!user.roles.includes('ROLE_ADMIN') && user.id !== targetId) {
    throw new MockHttpError(403, 'Forbidden', 'Access is denied')
  }
  const target = findUserById(targetId)
  if (!target) throw new MockHttpError(404, 'Not Found', `User not found with ID: ${targetId}`)
  return c.json(toUserDTO(target))
})

app.put('/api/v1/users/:userId', async (c) => {
  const user = requireUser(c)
  const targetId = c.req.param('userId')
  if (!user.roles.includes('ROLE_ADMIN') && user.id !== targetId) {
    throw new MockHttpError(403, 'Forbidden', 'Access is denied')
  }
  const body = await c.req.json<{ name?: string; image?: string }>()
  return c.json(toUserDTO(updateUserProfile(targetId, body)))
})

app.delete('/api/v1/users/:userId', (c) => {
  const admin = requireAdmin(c)
  const targetId = c.req.param('userId')
  if (admin.id === targetId) {
    throw new MockHttpError(403, 'Forbidden', 'Admins cannot delete their own account')
  }
  deleteUserRecord(targetId)
  return c.body(null, 204)
})

// --- links -----------------------------------------------------------------
app.post('/api/v1/shorten', async (c) => {
  const user = requireUser(c)
  const body = await c.req.json<{ longUrl: string; customAlias?: string }>()
  const link = createLink(user.id, body.longUrl, body.customAlias)
  return c.json({ shortUrl: `${MOCK_SHORT_DOMAIN}${link.shortCode}`, longUrl: link.longUrl }, 201)
})

app.get('/api/v1/urls/me', (c) => {
  const user = requireUser(c)
  const { page, size } = pageParams(c)
  return c.json(pageOf(listOwnedLinks(user.id).map(toUserUrlResponse), page, size))
})

app.put('/api/v1/urls/:shortCode', async (c) => {
  const user = requireUser(c)
  const body = await c.req.json<{ longUrl: string }>()
  const link = updateOwnedLink(c.req.param('shortCode'), user.id, body.longUrl)
  return c.json(toUserUrlResponse(link))
})

app.delete('/api/v1/urls/:shortCode', (c) => {
  const user = requireUser(c)
  deleteOwnedLink(c.req.param('shortCode'), user.id)
  return c.body(null, 204)
})

// --- admin -----------------------------------------------------------------
app.get('/api/admin/urls', (c) => {
  requireAdmin(c)
  const { page, size } = pageParams(c)
  return c.json(pageOf(listAllLinks().map(toUserUrlResponse), page, size))
})

app.delete('/api/admin/urls/:shortCode', (c) => {
  requireAdmin(c)
  adminDeleteLink(c.req.param('shortCode'))
  return c.body(null, 204)
})

// --- analytics -------------------------------------------------------------
app.get('/api/v1/analytics/overview', (c) => {
  const user = requireUser(c)
  return c.json(getOverview(user.id))
})

app.get('/api/v1/analytics/urls/:shortCode/history', (c) => {
  const user = requireUser(c)
  const days = Number.parseInt(c.req.query('days') ?? '30', 10)
  return c.json(getClickHistory(c.req.param('shortCode'), user.id, days))
})

app.get('/api/v1/analytics/urls/:shortCode/breakdown', (c) => {
  const user = requireUser(c)
  const days = Number.parseInt(c.req.query('days') ?? '30', 10)
  return c.json(getClickBreakdown(c.req.param('shortCode'), user.id, days))
})

app.get('/api/v1/analytics/urls/:shortCode', (c) => {
  const user = requireUser(c)
  return c.json(getUrlAnalytics(c.req.param('shortCode'), user.id))
})

// --- public redirect (last) ------------------------------------------------
app.get('/api/v1/:shortCode', (c) => {
  const link = findLink(c.req.param('shortCode'))
  if (!link) {
    throw new MockHttpError(404, 'Not Found', `URL not found for code: ${c.req.param('shortCode')}`)
  }
  link.clickCount += 1
  return c.redirect(link.longUrl, 302)
})

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`\n  PathIO mock API listening on http://localhost:${info.port}`)
  console.log(`  CORS origin : ${ALLOWED_ORIGIN}`)
  console.log(`  Admin login : ${MOCK_ADMIN_EMAIL} / ${MOCK_ADMIN_PASSWORD}`)
  console.log(`  OAuth user  : ${MOCK_USER_EMAIL} (via /oauth2/authorization/google)\n`)
})
