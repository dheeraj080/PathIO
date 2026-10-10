import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShortenForm } from '@/features/shorten/ShortenForm'
import { renderWithProviders } from '@/test/utils'
import { signInAs, MOCK_USER_EMAIL } from '@/mocks/fixtures'

describe('ShortenForm', () => {
  it('creates a short link for an authenticated user', async () => {
    signInAs(MOCK_USER_EMAIL)
    const user = userEvent.setup()
    renderWithProviders(<ShortenForm />, { route: '/dashboard' })

    await user.type(screen.getByLabelText('Long URL'), 'https://example.com/a-very-long-link')
    await user.click(screen.getByRole('button', { name: /shorten/i }))

    expect(await screen.findByText(/your short link is ready/i)).toBeInTheDocument()
  })

  it('shows a clear error when the custom alias is already taken', async () => {
    signInAs(MOCK_USER_EMAIL)
    const user = userEvent.setup()
    renderWithProviders(<ShortenForm />, { route: '/dashboard' })

    // Wait until the session is restored before submitting.
    await waitFor(() => expect(screen.getByLabelText('Long URL')).toBeInTheDocument())

    await user.type(screen.getByLabelText('Long URL'), 'https://example.com/another')
    await user.click(screen.getByRole('button', { name: /add a custom alias/i }))
    await user.type(screen.getByLabelText('Custom alias'), 'alice-01')
    await user.click(screen.getByRole('button', { name: /shorten/i }))

    expect(await screen.findByText(/already taken/i)).toBeInTheDocument()
  })
})
