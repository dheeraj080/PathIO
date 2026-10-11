// Access-token claim names emitted by JwtService (backend):
//   subject = user id (UUID), email, roles (string[]), typ ("access"), iss, exp, jti
export interface AccessTokenClaims {
  sub?: string
  email?: string
  roles?: string[]
  typ?: string
  iss?: string
  exp?: number
  jti?: string
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padLength)
  return atob(padded)
}

/** Decodes a JWT payload without verifying the signature. Returns null if malformed. */
export function decodeJwt(token: string): AccessTokenClaims | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const binary = base64UrlDecode(parts[1])
    const json = decodeURIComponent(
      binary
        .split('')
        .map((char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(json) as AccessTokenClaims
  } catch {
    return null
  }
}

export function tokenRoles(token: string | null | undefined): string[] {
  if (!token) return []
  return decodeJwt(token)?.roles ?? []
}

export function hasRole(token: string | null | undefined, role: string): boolean {
  return tokenRoles(token).includes(role)
}

export function isAdminToken(token: string | null | undefined): boolean {
  return hasRole(token, 'ROLE_ADMIN')
}

/** True when the token is expired or within `skewSeconds` of expiring. */
export function isTokenExpired(token: string, skewSeconds = 10): boolean {
  const claims = decodeJwt(token)
  if (!claims?.exp) return false
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000
}
