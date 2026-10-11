import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { server } from '@/mocks/server'
import { AuthProvider } from '@/auth/AuthContext'
import { useAuth } from '@/auth/useAuth'
import { apiRequest } from '@/lib/api'
import { tokenStore } from '@/lib/tokenStore'
import { signInAs, MOCK_USER_EMAIL } from '@/mocks/fixtures'
import { API_BASE_URL } from '@/lib/config'

function AuthProbe() {
  const { status, user, isAuthenticated } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
    </div>
  )
}

describe('AuthContext', () => {
  it('tears the session down when a silent refresh fails (FE-01)', async () => {
    // Seed a refresh cookie so the boot-time /auth/refresh restores a real session.
    signInAs(MOCK_USER_EMAIL)

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    expect(await screen.findByText('authenticated')).toBeInTheDocument()
    expect(screen.getByTestId('email')).toHaveTextContent(MOCK_USER_EMAIL)

    // An API call 401s and the silent refresh also fails (revoked/expired session).
    server.use(
      http.get(`${API_BASE_URL}/api/v1/analytics/overview`, () =>
        HttpResponse.json(
          { status: 401, error: 'Unauthorized', message: 'expired' },
          { status: 401 },
        ),
      ),
      http.post(`${API_BASE_URL}/api/v1/auth/refresh`, () =>
        HttpResponse.json(
          { status: 401, error: 'Unauthorized', message: 'Refresh Token not found' },
          { status: 401 },
        ),
      ),
    )

    await act(async () => {
      await expect(apiRequest('/api/v1/analytics/overview')).rejects.toBeInstanceOf(Error)
    })
    expect(tokenStore.get()).toBeNull()

    // The in-memory token drop must be mirrored into the full auth state so route
    // guards redirect anonymous visitors instead of serving an "authenticated" shell.
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
    expect(screen.getByTestId('email')).toHaveTextContent('none')
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
  })

  it('reload() failure also clears the session', async () => {
    signInAs(MOCK_USER_EMAIL)

    let probe!: { reload: () => Promise<void> }
    function ReloadProbe() {
      const auth = useAuth()
      probe = auth
      return <span data-testid="status">{auth.status}</span>
    }

    render(
      <AuthProvider>
        <ReloadProbe />
      </AuthProvider>,
    )

    expect(await screen.findByText('authenticated')).toBeInTheDocument()

    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/refresh`, () =>
        HttpResponse.json(
          { status: 401, error: 'Unauthorized', message: 'Refresh Token not found' },
          { status: 401 },
        ),
      ),
    )

    await act(async () => {
      await probe.reload()
    })

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
  })
})