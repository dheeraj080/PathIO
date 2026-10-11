import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { LinkList } from '@/features/links/LinkList'
import { renderWithProviders } from '@/test/utils'
import { signInAs, MOCK_USER_EMAIL, MOCK_SHORT_DOMAIN } from '@/mocks/fixtures'
import { pageOf } from '@/mocks/store'
import { server } from '@/mocks/server'
import { API_BASE_URL } from '@/lib/config'
import type { UserUrlResponse } from '@/types/api'

function fixedLinks() {
  const make = (shortCode: string, clickCount: number): UserUrlResponse => ({
    shortCode,
    shortUrl: `${MOCK_SHORT_DOMAIN}${shortCode}`,
    longUrl: `https://example.com/${shortCode}`,
    clickCount,
    createdAt: `2026-10-0${(clickCount % 9) + 1}T10:00:00Z`,
  })
  const items = [make('aaa', 5), make('bbb', 50), make('ccc', 15), make('ddd', 2)]
  server.use(http.get(`${API_BASE_URL}/api/v1/urls/me`, () => HttpResponse.json(pageOf(items, 0, 100))))
}

describe('LinkList', () => {
  it('paginates the current user links (10 per page)', async () => {
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<LinkList />, { route: '/dashboard' })

    expect(await screen.findByText(/Page 1 of 3/)).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(await screen.findByText(/Page 2 of 3/)).toBeInTheDocument()
  })

  it('sorts links by click count', async () => {
    fixedLinks()
    signInAs(MOCK_USER_EMAIL)
    const user = userEvent.setup()
    renderWithProviders(<LinkList />, { route: '/dashboard' })

    await screen.findByText(/Page 1 of 1/)
    await user.click(screen.getByRole('button', { name: /sort links/i }))
    await user.click(screen.getByRole('menuitem', { name: /most clicks/i }))

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('/bbb')
    expect(rows[1]).toHaveTextContent('/ccc')
    expect(rows[2]).toHaveTextContent('/aaa')
    expect(rows[3]).toHaveTextContent('/ddd')
  })

  it('filters links from the ?q= parameter across the whole window', async () => {
    fixedLinks()
    signInAs(MOCK_USER_EMAIL)
    renderWithProviders(<LinkList />, { route: '/dashboard?q=bbb' })

    await screen.findByText(/Page 1 of 1/)
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('/bbb')
  })

  it('shows a search empty state and clears it', async () => {
    fixedLinks()
    signInAs(MOCK_USER_EMAIL)
    const user = userEvent.setup()
    renderWithProviders(<LinkList />, { route: '/dashboard?q=zzz' })

    expect(await screen.findByText('No links found')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear search/i }))

    await waitFor(() => expect(screen.getByText(/\(4 total\)/)).toBeInTheDocument())
  })
})