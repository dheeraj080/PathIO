import { useEffect, useState } from 'react'

/**
 * Subscribes to a CSS media query. Returns `false` during SSR / when the browser
 * does not implement `matchMedia`, so callers can render a safe fallback.
 */
export function useMediaQuery(query: string): boolean {
  const read = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches

  const [matches, setMatches] = useState(read)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** True when the OS asks for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
