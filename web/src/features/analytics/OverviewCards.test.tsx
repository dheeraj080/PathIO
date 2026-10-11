import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { OverviewCards } from '@/features/analytics/OverviewCards'
import { renderWithProviders } from '@/test/utils'
import { signInAs, MOCK_USER_EMAIL } from '@/mocks/fixtures'

describe('OverviewCards', () => {
  it('shows the four dashboard metrics built from real data', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<OverviewCards />)

    expect(await screen.findByText(/Total links/i)).toBeInTheDocument()
    expect(await screen.findByText(/Total clicks/i)).toBeInTheDocument()
    expect(await screen.findByText(/Clicks · last 7 days/i)).toBeInTheDocument()

    // The most-popular card links to its analytics with the short code.
    const popularCode = await screen.findByText(/^\//)
    expect(popularCode).toHaveAttribute('href', expect.stringMatching(/^\/links\//))
  })
})