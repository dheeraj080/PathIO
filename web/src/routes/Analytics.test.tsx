import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Analytics } from '@/routes/Analytics'
import { renderWithProviders } from '@/test/utils'
import { signInAs, MOCK_USER_EMAIL } from '@/mocks/fixtures'

// Recharts' ResponsiveContainer is not meaningfully testable in jsdom.
vi.mock('@/components/charts/HistoryChart', () => ({
  HistoryChart: () => <div data-testid="history-chart" />,
}))

describe('Analytics', () => {
  it('defaults to the most recent link and shows its analytics view', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<Analytics />, { route: '/analytics' })

    // Newest seeded link is preselected in the picker.
    const trigger = await screen.findByRole('button', { name: 'Select link' })
    expect(trigger.textContent).toContain('alice-25')
    expect(await screen.findByText(/Total clicks/i)).toBeInTheDocument()
    expect(await screen.findByText(/unique visitors/i)).toBeInTheDocument()
    expect(await screen.findByText('Referrers')).toBeInTheDocument()
    expect(await screen.findByText('Devices')).toBeInTheDocument()
  })

  it('switches the analyzed link through the picker', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<Analytics />, { route: '/analytics' })

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Select link' }))
    await user.click(await screen.findByRole('menuitem', { name: /alice-20/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Select link' }).textContent).toContain('alice-20')
    })
  })
})