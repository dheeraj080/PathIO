type Listener = () => void

let accessToken: string | null = null
const listeners = new Set<Listener>()

/**
 * In-memory access-token store. Intentionally never persisted to
 * localStorage/sessionStorage — the HttpOnly refresh cookie restores the
 * session on reload.
 */
export const tokenStore = {
  get(): string | null {
    return accessToken
  },
  set(token: string | null): void {
    if (accessToken === token) return
    accessToken = token
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
