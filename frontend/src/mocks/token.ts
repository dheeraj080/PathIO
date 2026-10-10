import type { MockUser } from './store'

export interface MockTokenClaims {
  sub: string
  email: string
  roles?: string[]
  typ: 'access' | 'refresh'
  iss: string
  exp: number
  jti: string
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

let jtiCounter = 0

export function randomJti(): string {
  jtiCounter += 1
  return `mock-jti-${jtiCounter}-${Date.now().toString(36)}`
}

export function issueToken(
  user: MockUser,
  typ: 'access' | 'refresh',
  ttlSeconds: number,
  jti: string,
): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS512', typ: 'JWT' }))
  const claims: MockTokenClaims = {
    sub: user.id,
    email: user.email,
    typ,
    iss: 'pathio',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    jti,
  }
  if (typ === 'access') claims.roles = user.roles
  const payload = toBase64Url(JSON.stringify(claims))
  return `${header}.${payload}.mock-signature`
}

export function decodeToken(token: string): MockTokenClaims | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    return JSON.parse(fromBase64Url(parts[1])) as MockTokenClaims
  } catch {
    return null
  }
}
