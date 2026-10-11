import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Signup } from '@/routes/Signup'
import { renderWithProviders } from '@/test/utils'
import { mockOAuthPayload, simulateOAuthSuccess } from '@/mocks/oauth'

function DashboardProbe() {
  const location = useLocation()
  return <div>DASHBOARD{location.search}</div>
}

function renderSignup(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<DashboardProbe />} />
    </Routes>,
    { route },
  )
}

describe('Signup', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates accounts through providers only (no password field)', async () => {
    renderSignup('/signup')

    expect(await screen.findByRole('button', { name: /sign up with google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up with github/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/password/i)).toBeNull()
  })

  it('preserves the requested destination after provider sign-in', async () => {
    const prefill = encodeURIComponent('https://example.com/from-signup')
    const redirect = encodeURIComponent(`/dashboard?prefill=${prefill}`)
    vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      close: vi.fn(),
    } as unknown as Window)

    renderSignup(`/signup?redirect=${redirect}`)

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /sign up with github/i }))

    simulateOAuthSuccess(mockOAuthPayload())

    expect(await screen.findByText(`DASHBOARD?prefill=${prefill}`)).toBeInTheDocument()
  })
})