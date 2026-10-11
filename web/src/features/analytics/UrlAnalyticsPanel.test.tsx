import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { UrlAnalyticsPanel } from '@/features/analytics/UrlAnalyticsPanel'
import { renderWithProviders } from '@/test/utils'
import { signInAs, MOCK_USER_EMAIL } from '@/mocks/fixtures'

describe('UrlAnalyticsPanel', () => {
  it('shows an error when the link is not owned by the current user', async () => {
    signInAs(MOCK_USER_EMAIL)
    // "bob-1" belongs to another seeded user -> owner-scoped 404.
    renderWithProviders(<UrlAnalyticsPanel shortCode="bob-1" />)

    expect(await screen.findByText('Analytics unavailable')).toBeInTheDocument()
    expect(await screen.findByText(/URL not found for short code: bob-1/i)).toBeInTheDocument()
  })
})
