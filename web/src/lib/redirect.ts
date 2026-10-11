/**
 * Validates a `redirect` query-string value before navigating to it.
 *
 * Only same-origin, absolute paths are allowed (must start with a single `/`),
 * so a crafted link cannot bounce the user to an external site. Anything else
 * falls back to the given default.
 */
export function safeRedirect(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
