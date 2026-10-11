import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useLocation } from 'react-router-dom'
import { server } from '@/mocks/server'
import { Dashboard } from '@/routes/Dashboard'
import { FirstLinkNudge } from '@/features/links/FirstLinkNudge'
import { renderWithProviders } from '@/test/utils'
import { signInAs, MOCK_USER_EMAIL } from '@/mocks/fixtures'
import { pageOf } from '@/mocks/store'
import { API_BASE_URL } from '@/lib/config'

function emptyLinks() {
  server.use(
    http.get(`${API_BASE_URL}/api/v1/urls/me`, () => HttpResponse.json(pageOf([], 0, 10))),
  )
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.search}</div>
}

describe('FirstLinkNudge', () => {
  it('does not appear when the account already owns links', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<Dashboard />, { route: '/dashboard' })

    // The link list is loaded (25 seeded links -> 3 pages).
    await screen.findByText(/Page 1 of 3/)
    expect(screen.queryByRole('region', { name: /getting started/i })).toBeNull()
  })

  it('appears for an empty account and offers to start shortening', async () => {
    emptyLinks()
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<Dashboard />, { route: '/dashboard' })

    const region = await screen.findByRole('region', { name: /getting started/i })
    expect(
      within(region).getByRole('heading', { name: /create your first short link/i }),
    ).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: /start shortening/i })).toBeInTheDocument()
  })

  it('prioritizes a valid carried prefill and discarding removes the parameter', async () => {
    emptyLinks()
    signInAs(MOCK_USER_EMAIL)
    const prefill = encodeURIComponent('https://example.com/carried-url')
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <>
              <FirstLinkNudge onStart={() => {}} />
              <LocationProbe />
            </>
          }
        />
      </Routes>,
      { route: `/dashboard?prefill=${prefill}` },
    )

    const region = await screen.findByRole('region', { name: /getting started/i })
    expect(
      within(region).getByRole('heading', { name: /finish creating your short link/i }),
    ).toBeInTheDocument()

    await user.click(within(region).getByRole('button', { name: /discard the carried URL/i }))

    await waitFor(() => expect(screen.queryByText(/prefill=/i)).toBeNull())
  })

  it('ignores a prefill that is not a valid http(s) URL', async () => {
    emptyLinks()
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<FirstLinkNudge onStart={() => {}} />, {
      route: '/dashboard?prefill=javascript%3Aalert(1)',
    })

    const region = await screen.findByRole('region', { name: /getting started/i })
    expect(
      within(region).queryByRole('heading', { name: /finish creating your short link/i }),
    ).toBeNull()
    expect(
      within(region).getByRole('heading', { name: /create your first short link/i }),
    ).toBeInTheDocument()
  })
})