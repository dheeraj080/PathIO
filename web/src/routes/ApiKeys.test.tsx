import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiKeys } from '@/routes/ApiKeys'
import { renderWithProviders } from '@/test/utils'
import { createApiKey, findUserByEmail } from '@/mocks/store'
import { MOCK_USER_EMAIL, resetMockData, signInAs } from '@/mocks/fixtures'

describe('ApiKeys page', () => {
  beforeEach(() => {
    resetMockData()
  })

  it('starts with an empty state', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<ApiKeys />, { route: '/api-keys' })

    expect(await screen.findByText(/no api keys yet/i)).toBeInTheDocument()
  })

  it('creates a key and reveals the plaintext exactly once', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<ApiKeys />, { route: '/api-keys' })
    await screen.findByText(/no api keys yet/i)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/key name/i), 'ci-deploy')
    await user.click(screen.getByRole('button', { name: /create api key/i }))

    // Plaintext banner is shown once, with the pio_ prefix.
    const banner = await screen.findByTestId('new-api-key')
    expect(banner).toHaveTextContent(/^pio_/)
    expect(screen.getByText(/copy your key now/i)).toBeInTheDocument()

    // The key now appears in the list.
    expect(await screen.findByText('ci-deploy')).toBeInTheDocument()

    // Dismissing hides the plaintext, but the key stays listed.
    await user.click(screen.getByRole('button', { name: /dismiss api key/i }))
    expect(screen.queryByTestId('new-api-key')).not.toBeInTheDocument()
    expect(screen.getByText('ci-deploy')).toBeInTheDocument()
  })

  it('revokes an existing key after confirmation', async () => {
    const alice = findUserByEmail(MOCK_USER_EMAIL)!
    createApiKey(alice.id, 'ci-deploy')
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<ApiKeys />, { route: '/api-keys' })

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /revoke ci-deploy/i }))

    // Confirmation dialog, then confirm.
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /revoke key/i }))

    expect(await screen.findByText('Revoked')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /revoke ci-deploy/i })).not.toBeInTheDocument()
  })

  it('flags an expired key', async () => {
    const alice = findUserByEmail(MOCK_USER_EMAIL)!
    const { key } = createApiKey(alice.id, 'stale', 1)
    key.expiresAt = new Date(Date.now() - 1000).toISOString()
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<ApiKeys />, { route: '/api-keys' })

    expect(await screen.findByText('Expired')).toBeInTheDocument()
  })
})
