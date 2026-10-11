import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinksTable } from '@/features/links/LinksTable'
import { renderWithProviders } from '@/test/utils'
import { signInAs, MOCK_USER_EMAIL } from '@/mocks/fixtures'

describe('LinksTable', () => {
  it('paginates the current user links (10 per page)', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<LinksTable />, { route: '/dashboard' })

    expect(await screen.findByText(/Page 1 of 3/)).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(await screen.findByText(/Page 2 of 3/)).toBeInTheDocument()
  })
})
