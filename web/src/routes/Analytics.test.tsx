import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Analytics } from '@/routes/Analytics'
import { renderWithProviders } from '@/test/utils'
import { signInAs, MOCK_USER_EMAIL, MOCK_SHORT_DOMAIN } from '@/mocks/fixtures'
import { server } from '@/mocks/server'
import { API_BASE_URL } from '@/lib/config'

// Recharts' ResponsiveContainer is not meaningfully testable in jsdom.
vi.mock('@/components/charts/HistoryChart', () => ({
  HistoryChart: () => <div data-testid="history-chart" />,
}))

describe('Analytics', () => {
  it('shows the all-links timeline, breakdowns and top links', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<Analytics />, { route: '/analytics' })

    expect(await screen.findByRole('heading', { name: /all links/i })).toBeInTheDocument()
    expect(await screen.findByText('Total clicks · all links')).toBeInTheDocument()
    expect(await screen.findByText('Referrers')).toBeInTheDocument()
    expect(await screen.findByText('Devices')).toBeInTheDocument()
    expect(await screen.findByText('Top links')).toBeInTheDocument()
    expect(await screen.findByTestId('history-chart')).toBeInTheDocument()
  })

  it('switches the range tabs', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<Analytics />, { route: '/analytics' })

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /7d/i }))

    expect(screen.getByRole('button', { name: /7d/i })).toHaveClass('border-foreground')
  })

  it('renders the top links returned by the API, ranked by clicks', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/v1/analytics/top-links`, () =>
        HttpResponse.json([
          {
            shortCode: 'best',
            shortUrl: `${MOCK_SHORT_DOMAIN}best`,
            longUrl: 'https://example.com/best',
            clickCount: 120,
          },
          {
            shortCode: 'ok',
            shortUrl: `${MOCK_SHORT_DOMAIN}ok`,
            longUrl: 'https://example.com/ok',
            clickCount: 8,
          },
        ]),
      ),
    )
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<Analytics />, { route: '/analytics' })

    expect(await screen.findByText('/best')).toBeInTheDocument()
    expect(await screen.findByText('/ok')).toBeInTheDocument()
  })
})