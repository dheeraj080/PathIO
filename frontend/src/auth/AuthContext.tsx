import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
  type OAuthProvider,
} from '@/api/auth.api'
import { startOAuth } from '@/auth/oauth'
import { isAdminToken } from '@/lib/jwt'
import { tokenStore } from '@/lib/tokenStore'
import type { UserDTO } from '@/types/api'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: UserDTO | null
  accessToken: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithProvider: (provider: OAuthProvider) => Promise<void>
  logout: () => Promise<void>
  /** Re-fetches the session (token + user) from the backend. */
  reload: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<UserDTO | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(tokenStore.get())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Keep local token state in sync with the shared store (e.g. silent refresh).
  useEffect(() => tokenStore.subscribe(() => setAccessToken(tokenStore.get())), [])

  const applySession = useCallback((token: string, nextUser: UserDTO | null) => {
    tokenStore.set(token)
    setAccessToken(token)
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const clearSession = useCallback(() => {
    tokenStore.set(null)
    setAccessToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  // Boot: try to restore the session from the HttpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await refreshRequest()
        if (!cancelled) applySession(data.accessToken, data.user)
      } catch {
        if (!cancelled) clearSession()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applySession, clearSession])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await loginRequest(email, password)
      applySession(data.accessToken, data.user)
    },
    [applySession],
  )

  const loginWithProvider = useCallback(
    async (provider: OAuthProvider) => {
      const payload = await startOAuth(provider)
      applySession(payload.accessToken, {
        id: payload.user.id,
        email: payload.user.email,
        name: payload.user.name,
        image: payload.user.image,
      })
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // Even if the server call fails, drop local state.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const reload = useCallback(async () => {
    try {
      const data = await refreshRequest()
      applySession(data.accessToken, data.user)
    } catch {
      clearSession()
    }
  }, [applySession, clearSession])

  const isAdmin = useMemo(() => {
    if (user?.roles?.some((role) => role.name === 'ROLE_ADMIN')) return true
    return isAdminToken(accessToken)
  }, [user, accessToken])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      isAuthenticated: status === 'authenticated',
      isAdmin,
      login,
      loginWithProvider,
      logout,
      reload,
    }),
    [status, user, accessToken, isAdmin, login, loginWithProvider, logout, reload],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
