import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Login } from '@/routes/Login'
import { renderWithProviders } from '@/test/utils'
import { mockOAuthPayload, simulateOAuthSuccess } from '@/mocks/oauth'
import {
  MOCK_ADMIN_EMAIL,
  MOCK_ADMIN_PASSWORD,
  MOCK_USER_EMAIL,
  signInAs,
} from '@/mocks/fixtures'

function DashboardProbe() {
  const location = useLocation()
  return <div>DASHBOARD{location.search}</div>
}

function renderLogin(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<DashboardProbe />} />
    </Routes>,
    { route },
  )
}

describe('Login', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restores an existing session and redirects to the requested route', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderLogin('/login?redirect=%2Fdashboard')
    expect(await screen.findByText(/DASHBOARD/)).toBeInTheDocument()
  })

  it('preserves the requested destination (including the hero prefill) after OAuth', async () => {
    const prefill = encodeURIComponent('https://example.com/kept')
    const redirect = encodeURIComponent(`/dashboard?prefill=${prefill}`)
    vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      close: vi.fn(),
    } as unknown as Window)

    renderLogin(`/login?redirect=${redirect}`)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /continue with google/i }))

    // A flow is running: both provider buttons stay locked.
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeDisabled()

    simulateOAuthSuccess(mockOAuthPayload())

    expect(await screen.findByText(`DASHBOARD?prefill=${prefill}`)).toBeInTheDocument()
  })

  it('shows a recoverable error when the popup is blocked and re-enables retry', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null as unknown as Window)
    renderLogin('/login')

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /continue with github/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/popup was blocked/i)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeEnabled()
  })

  it('keeps administrator sign-in separate and translates OAUTH_ONLY clearly', async () => {
    renderLogin('/login')

    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email'), MOCK_USER_EMAIL)
    await user.type(screen.getByLabelText('Password'), 'not-a-password')
    await user.click(screen.getByRole('button', { name: /sign in as administrator/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/reserved for the administrator/i)
  })

  it('lets the provisioned administrator sign in with credentials', async () => {
    renderLogin('/login?redirect=%2Fdashboard')

    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email'), MOCK_ADMIN_EMAIL)
    await user.type(screen.getByLabelText('Password'), MOCK_ADMIN_PASSWORD)
    await user.click(screen.getByRole('button', { name: /sign in as administrator/i }))

    expect(await screen.findByText(/DASHBOARD/)).toBeInTheDocument()
  })

  it('shows a waiting status while an OAuth flow is running', async () => {
    vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      close: vi.fn(),
    } as unknown as Window)

    renderLogin('/login')

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /continue with google/i }))

    expect(await screen.findByText(/waiting for google/i)).toBeInTheDocument()

    simulateOAuthSuccess(mockOAuthPayload())
    await waitFor(() => expect(screen.queryByText(/waiting for google/i)).toBeNull())
  })
})