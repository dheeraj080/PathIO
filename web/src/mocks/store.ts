import type {
  AnalyticsOverviewResponse,
  ApiKeyDTO,
  ClickBreakdownResponse,
  ClickHistoryPoint,
  DimensionCount,
  Page,
  UrlAnalyticsResponse,
  UserDTO,
  UserUrlResponse,
} from '../types/api'

// ---------------------------------------------------------------------------
// Framework-agnostic in-memory mock backend, shared by the MSW handlers
// (Vitest + browser) and the standalone Hono server.
//
// Mirrors the real Spring contract: auth required to shorten, custom-alias
// conflict -> 409, Spring `Page<>` envelope, owner-scoped 404, ROLE_ADMIN gating.
// ---------------------------------------------------------------------------

export const MOCK_ADMIN_EMAIL = 'admin@pathio.local'
export const MOCK_ADMIN_PASSWORD = 'admin12345'
export const MOCK_USER_EMAIL = 'alice@example.com'
export const MOCK_SHORT_DOMAIN = 'https://path.io/'

const MAX_ALIAS_LENGTH = 32
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{1,32}$/
const RESERVED_ALIASES = new Set([
  'api', 'auth', 'admin', 'users', 'urls', 'analytics',
  'actuator', 'swagger', 'swagger-ui', 'v3', 'login', 'error',
  'public', 'health', 'favicon.ico',
])

export class MockHttpError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface MockUser {
  id: string
  name: string
  email: string
  password?: string
  image: string | null
  provider: 'LOCAL' | 'GOOGLE' | 'GITHUB'
  enabled: boolean
  createdAt: string
  roles: string[]
}

export interface MockLink {
  shortCode: string
  longUrl: string
  ownerId: string
  clickCount: number
  createdAt: string
}

export interface MockClick {
  shortCode: string
  at: string
  referrer: string
  device: string
  visitor: string
}

export interface MockApiKey {
  id: number
  name: string
  /** Digest only — the plaintext key exists solely in the create response. */
  keyHash: string
  active: boolean
  createdAt: string
  expiresAt: string | null
  lastUsedAt: string | null
  ownerId: string
}

interface MockState {
  users: MockUser[]
  links: MockLink[]
  clicks: MockClick[]
  apiKeys: MockApiKey[]
  refreshing: Map<string, string> // jti -> userId
}

const REFERRERS = [
  'https://twitter.com',
  'https://www.google.com',
  'https://news.ycombinator.com',
  'https://www.reddit.com',
  'https://www.linkedin.com',
  '', // direct
]
const DEVICES = ['desktop', 'mobile', 'tablet', 'bot']
const DEVICE_UA: Record<string, string> = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  tablet: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
  bot: 'Googlebot/2.1',
}

let state: MockState = { users: [], links: [], clicks: [], apiKeys: [], refreshing: new Map() }

function makeRng(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0xffffffff
  }
}

function daysAgoIso(days: number, hour = 12): string {
  const date = new Date()
  date.setUTCHours(hour, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

function todayIso(): string {
  return new Date().toISOString()
}

let idCounter = 1000
function nextId(): string {
  idCounter += 1
  const n = idCounter.toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${n}`
}

let apiKeyIdCounter = 0

const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
function randomShortCode(): string {
  let out = ''
  for (let i = 0; i < 7; i += 1) {
    out += BASE62[Math.floor(Math.random() * BASE62.length)]
  }
  return out
}

function seedLink(
  ownerId: string,
  index: number,
  longUrl: string,
  code: string,
  seed: number,
): MockLink {
  const rng = makeRng(seed)
  const clickCount = Math.floor(rng() * 60)
  const createdAt = daysAgoIso(40 - index, 9)
  const link: MockLink = { shortCode: code, longUrl, ownerId, clickCount, createdAt }

  let produced = 0
  let day = 0
  while (produced < clickCount && day < 60) {
    const roll = rng()
    if (roll > 0.45) {
      const referrer = REFERRERS[Math.floor(rng() * REFERRERS.length)]
      const device = DEVICES[Math.floor(rng() * DEVICES.length)]
      state.clicks.push({
        shortCode: code,
        at: daysAgoIso(day, Math.floor(rng() * 20) + 1),
        referrer,
        device,
        visitor: `v-${Math.floor(rng() * Math.max(1, Math.floor(clickCount * 0.7)))}`,
      })
      produced += 1
    }
    day = (day + 1) % 30
  }
  link.clickCount = produced
  return link
}

export function resetMockData(): void {
  idCounter = 1000
  apiKeyIdCounter = 0
  state = { users: [], links: [], clicks: [], apiKeys: [], refreshing: new Map() }

  const admin: MockUser = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'System Administrator',
    email: MOCK_ADMIN_EMAIL,
    password: MOCK_ADMIN_PASSWORD,
    image: null,
    provider: 'LOCAL',
    enabled: true,
    createdAt: daysAgoIso(90, 8),
    roles: ['ROLE_ADMIN', 'ROLE_USER'],
  }
  const alice: MockUser = {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Alice Johnson',
    email: MOCK_USER_EMAIL,
    image: 'https://i.pravatar.cc/64?img=5',
    provider: 'GOOGLE',
    enabled: true,
    createdAt: daysAgoIso(60, 10),
    roles: ['ROLE_USER'],
  }
  const bob: MockUser = {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Bob Smith',
    email: 'bob@example.com',
    image: null,
    provider: 'GITHUB',
    enabled: true,
    createdAt: daysAgoIso(45, 11),
    roles: ['ROLE_USER'],
  }
  state.users = [admin, alice, bob]

  const aliceLinks: MockLink[] = []
  for (let i = 0; i < 25; i += 1) {
    aliceLinks.push(
      seedLink(
        alice.id,
        i,
        `https://example.com/articles/${i + 1}/introduction-to-topic-${i + 1}`,
        `alice-${(i + 1).toString().padStart(2, '0')}`,
        100 + i,
      ),
    )
  }
  const bobLinks: MockLink[] = []
  for (let i = 0; i < 6; i += 1) {
    bobLinks.push(
      seedLink(bob.id, i, `https://bob.dev/posts/${i + 1}`, `bob-${i + 1}`, 500 + i),
    )
  }
  const adminLinks: MockLink[] = [
    seedLink(admin.id, 0, 'https://pathio.example/status', 'status-page', 900),
    seedLink(admin.id, 1, 'https://pathio.example/docs', 'docs', 901),
  ]
  state.links = [...aliceLinks, ...bobLinks, ...adminLinks]
}

// --- serialization helpers -------------------------------------------------

export function toUserDTO(user: MockUser): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    enabled: user.enabled,
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
    provider: user.provider,
    roles: user.roles.map((name, index) => ({ id: `${user.id}-role-${index}`, name })),
  }
}

export function toUserUrlResponse(link: MockLink): UserUrlResponse {
  return {
    shortCode: link.shortCode,
    shortUrl: `${MOCK_SHORT_DOMAIN}${link.shortCode}`,
    longUrl: link.longUrl,
    clickCount: link.clickCount,
    createdAt: link.createdAt,
  }
}

export function pageOf<T>(items: T[], number: number, size: number): Page<T> {
  const safeSize = size > 0 ? size : 20
  const totalElements = items.length
  const totalPages = Math.max(1, Math.ceil(totalElements / safeSize))
  const safeNumber = Math.min(Math.max(number, 0), totalPages - 1)
  const start = safeNumber * safeSize
  const content = items.slice(start, start + safeSize)
  return {
    content,
    totalElements,
    totalPages,
    size: safeSize,
    number: safeNumber,
    numberOfElements: content.length,
    first: safeNumber === 0,
    last: safeNumber >= totalPages - 1,
    empty: content.length === 0,
  }
}

// --- lookups ---------------------------------------------------------------

export function findUserByEmail(email: string): MockUser | undefined {
  return state.users.find((user) => user.email.toLowerCase() === email.toLowerCase())
}

export function findUserById(id: string): MockUser | undefined {
  return state.users.find((user) => user.id === id)
}

export function findUserByProvider(provider: string, providerId: string): MockUser | undefined {
  return state.users.find((user) => user.provider === provider && user.id === providerId)
}

export function listUsers(): MockUser[] {
  return [...state.users]
}

export function findLink(shortCode: string): MockLink | undefined {
  return state.links.find((link) => link.shortCode === shortCode)
}

// --- auth ------------------------------------------------------------------

export function authenticateAdmin(email: string, password: string): MockUser {
  const user = findUserByEmail(email)
  const isAdminLocal =
    user && user.provider === 'LOCAL' && user.roles.includes('ROLE_ADMIN')
  if (user && !isAdminLocal) {
    throw new MockHttpError(403, 'OAUTH_ONLY', 'Sign in with Google or GitHub')
  }
  if (!user || user.password !== password) {
    throw new MockHttpError(401, 'Unauthorized', 'Bad credentials')
  }
  return user
}

export function loginOrRegisterOAuth(provider: 'google' | 'github'): MockUser {
  if (provider === 'google') {
    const existing = findUserByEmail(MOCK_USER_EMAIL)
    if (existing) return existing
  }
  // Create a new OAuth user deterministically.
  const user: MockUser = {
    id: nextId(),
    name: provider === 'github' ? 'octocat' : 'OAuth User',
    email: provider === 'github' ? 'octocat@github.com' : `oauth-${Date.now()}@example.com`,
    image: null,
    provider: provider === 'google' ? 'GOOGLE' : 'GITHUB',
    enabled: true,
    createdAt: todayIso(),
    roles: ['ROLE_USER'],
  }
  state.users.push(user)
  return user
}

export function registerRefreshToken(jti: string, userId: string): void {
  state.refreshing.set(jti, userId)
}

export function consumeRefreshToken(jti: string): string {
  const userId = state.refreshing.get(jti)
  if (!userId) throw new MockHttpError(401, 'Unauthorized', 'Refresh token not recognized')
  state.refreshing.delete(jti)
  return userId
}

export function revokeRefreshToken(jti: string): void {
  state.refreshing.delete(jti)
}

// --- links CRUD ------------------------------------------------------------

export function createLink(ownerId: string, longUrl: string, customAlias?: string): MockLink {
  if (typeof longUrl !== 'string' || longUrl.trim() === '') {
    throw new MockHttpError(400, 'Bad Request', 'longUrl must not be blank')
  }
  try {
    const parsed = new URL(longUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('bad protocol')
    }
  } catch {
    throw new MockHttpError(400, 'Bad Request', 'Invalid or malformed URL')
  }

  let shortCode: string
  const alias = customAlias?.trim()
  if (alias) {
    if (alias.length > MAX_ALIAS_LENGTH) {
      throw new MockHttpError(400, 'Bad Request', `Alias must be at most ${MAX_ALIAS_LENGTH} characters`)
    }
    if (!ALIAS_PATTERN.test(alias)) {
      throw new MockHttpError(
        400,
        'Bad Request',
        'Alias may only contain letters, digits, hyphens and underscores',
      )
    }
    if (RESERVED_ALIASES.has(alias.toLowerCase())) {
      throw new MockHttpError(400, 'Bad Request', `Alias is reserved and cannot be used: ${alias}`)
    }
    if (findLink(alias)) {
      throw new MockHttpError(409, 'Conflict', `Alias is already taken: ${alias}`)
    }
    shortCode = alias
  } else {
    shortCode = randomShortCode()
    while (findLink(shortCode)) shortCode = randomShortCode()
  }

  const link: MockLink = {
    shortCode,
    longUrl,
    ownerId,
    clickCount: 0,
    createdAt: todayIso(),
  }
  state.links.unshift(link)
  return link
}

export function listOwnedLinks(ownerId: string): MockLink[] {
  return state.links
    .filter((link) => link.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listAllLinks(): MockLink[] {
  return [...state.links].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function updateOwnedLink(shortCode: string, ownerId: string, longUrl: string): MockLink {
  const link = state.links.find((item) => item.shortCode === shortCode && item.ownerId === ownerId)
  if (!link) {
    throw new MockHttpError(404, 'Not Found', `URL not found for short code: ${shortCode}`)
  }
  link.longUrl = longUrl
  return link
}

export function deleteOwnedLink(shortCode: string, ownerId: string): void {
  const index = state.links.findIndex(
    (item) => item.shortCode === shortCode && item.ownerId === ownerId,
  )
  if (index === -1) {
    throw new MockHttpError(404, 'Not Found', `URL not found for short code: ${shortCode}`)
  }
  state.links.splice(index, 1)
  state.clicks = state.clicks.filter((click) => click.shortCode !== shortCode)
}

export function adminDeleteLink(shortCode: string): void {
  const index = state.links.findIndex((item) => item.shortCode === shortCode)
  if (index === -1) {
    throw new MockHttpError(404, 'Not Found', `URL not found for short code: ${shortCode}`)
  }
  state.links.splice(index, 1)
  state.clicks = state.clicks.filter((click) => click.shortCode !== shortCode)
}

// --- users CRUD ------------------------------------------------------------

export function createUser(input: { name?: string; email: string; password: string }): MockUser {
  if (!input.email || !input.password) {
    throw new MockHttpError(400, 'Bad Request', 'Email and password are required')
  }
  if (findUserByEmail(input.email)) {
    throw new MockHttpError(409, 'Conflict', `Email already in use: ${input.email}`)
  }
  const user: MockUser = {
    id: nextId(),
    name: input.name ?? input.email,
    email: input.email,
    password: input.password,
    image: null,
    provider: 'LOCAL',
    enabled: true,
    createdAt: todayIso(),
    roles: ['ROLE_USER'],
  }
  state.users.push(user)
  return user
}

export function updateUserProfile(id: string, patch: { name?: string; image?: string }): MockUser {
  const user = findUserById(id)
  if (!user) throw new MockHttpError(404, 'Not Found', `User not found with ID: ${id}`)
  if (patch.name != null) user.name = patch.name
  if (patch.image != null) user.image = patch.image
  return user
}

export function deleteUserRecord(id: string): void {
  const index = state.users.findIndex((user) => user.id === id)
  if (index === -1) throw new MockHttpError(404, 'Not Found', `User not found with ID: ${id}`)
  state.users.splice(index, 1)
}

// --- API keys CRUD ---------------------------------------------------------

const KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const KEY_PREFIX = 'pio_'

function randomKeyToken(): string {
  let out = ''
  const webCrypto = typeof crypto !== 'undefined' ? crypto : undefined
  for (let i = 0; i < 32; i += 1) {
    const roll = webCrypto?.getRandomValues
      ? webCrypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff
      : Math.random()
    out += KEY_ALPHABET[Math.floor(roll * KEY_ALPHABET.length)]
  }
  return out
}

/**
 * 64-char hex digest stand-in for the mock layer. Not cryptographic; it only
 * guarantees the mock never keeps the plaintext key, mirroring the backend.
 */
function mockKeyDigest(plaintext: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < plaintext.length; i += 1) {
    hash ^= plaintext.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0').repeat(8)
}

export function toApiKeyDTO(key: MockApiKey): ApiKeyDTO {
  return {
    id: key.id,
    name: key.name,
    active: key.active,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
  }
}

export function listApiKeys(ownerId: string): MockApiKey[] {
  return state.apiKeys
    .filter((key) => key.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createApiKey(
  ownerId: string,
  name: string,
  expiresInDays?: number | null,
): { plaintext: string; key: MockApiKey } {
  if (!name || !name.trim()) {
    throw new MockHttpError(400, 'Bad Request', 'Key name is required')
  }
  if (name.trim().length > 64) {
    throw new MockHttpError(400, 'Bad Request', 'Key name must be at most 64 characters')
  }
  const plaintext = `${KEY_PREFIX}${randomKeyToken()}`
  const now = new Date()
  const key: MockApiKey = {
    id: (apiKeyIdCounter += 1),
    name: name.trim(),
    keyHash: mockKeyDigest(plaintext),
    active: true,
    createdAt: now.toISOString(),
    expiresAt:
      expiresInDays && expiresInDays > 0
        ? new Date(now.getTime() + expiresInDays * 86_400_000).toISOString()
        : null,
    lastUsedAt: null,
    ownerId,
  }
  state.apiKeys.push(key)
  return { plaintext, key }
}

export function revokeApiKey(ownerId: string, id: number): MockApiKey {
  const key = state.apiKeys.find((item) => item.id === id && item.ownerId === ownerId)
  if (!key) throw new MockHttpError(404, 'Not Found', 'API key not found')
  key.active = false
  return key
}

// --- analytics -------------------------------------------------------------

export function getOverview(ownerId: string): AnalyticsOverviewResponse {
  const links = state.links.filter((link) => link.ownerId === ownerId)
  return {
    totalUrls: links.length,
    totalClicks: links.reduce((sum, link) => sum + link.clickCount, 0),
  }
}

function requireOwnedLink(shortCode: string, ownerId: string): MockLink {
  const link = state.links.find((item) => item.shortCode === shortCode && item.ownerId === ownerId)
  if (!link) {
    // Non-owned and non-existent links are indistinguishable (404), matching the backend.
    throw new MockHttpError(404, 'Not Found', `URL not found for short code: ${shortCode}`)
  }
  return link
}

export function getUrlAnalytics(shortCode: string, ownerId: string): UrlAnalyticsResponse {
  const link = requireOwnedLink(shortCode, ownerId)
  const clicks = state.clicks.filter((click) => click.shortCode === shortCode)
  const unique = new Set(clicks.map((click) => click.visitor)).size
  return {
    shortCode: link.shortCode,
    shortUrl: `${MOCK_SHORT_DOMAIN}${link.shortCode}`,
    longUrl: link.longUrl,
    totalClicks: link.clickCount,
    uniqueClicks: unique,
    createdAt: link.createdAt,
  }
}

export function getClickHistory(shortCode: string, ownerId: string, days: number): ClickHistoryPoint[] {
  requireOwnedLink(shortCode, ownerId)
  const bounded = Math.min(Math.max(days, 1), 365)
  const clicks = state.clicks.filter((click) => click.shortCode === shortCode)

  const buckets = new Map<string, number>()
  const now = new Date()
  for (let offset = bounded - 1; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - offset)
    buckets.set(date.toISOString().slice(0, 10), 0)
  }
  for (const click of clicks) {
    const key = click.at.slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, clicks: count }))
}

function topCounts(entries: string[]): DimensionCount[] {
  const counts = new Map<string, number>()
  for (const entry of entries) counts.set(entry, (counts.get(entry) ?? 0) + 1)
  return [...counts.entries()]
    .map(([value, clicks]) => ({ value, clicks }))
    .sort((a, b) => b.clicks - a.clicks || a.value.localeCompare(b.value))
    .slice(0, 10)
}

export function getClickBreakdown(
  shortCode: string,
  ownerId: string,
  days: number,
): ClickBreakdownResponse {
  requireOwnedLink(shortCode, ownerId)
  const bounded = Math.min(Math.max(days, 1), 365)
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - (bounded - 1))

  const clicks = state.clicks.filter(
    (click) => click.shortCode === shortCode && new Date(click.at) >= since,
  )
  return {
    referrers: topCounts(clicks.map((click) => click.referrer)),
    devices: topCounts(clicks.map((click) => click.device)),
  }
}

export function userAgentForDevice(device: string): string {
  return DEVICE_UA[device] ?? DEVICE_UA.desktop
}

// Seed once on module load so tests without an explicit reset still have data.
resetMockData()
