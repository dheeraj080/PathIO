import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { ShortenForm } from '@/features/shorten/ShortenForm'
import { buildLoginRedirect } from '@/features/shorten/HeroShortenForm'
import { renderWithProviders } from '@/test/utils'
import { safeRedirect } from '@/lib/redirect'

describe('marketing hero redirect', () => {
  it('carries the destination URL through the redirect param', () => {
    const loginUrl = buildLoginRedirect('https://example.com/campaign?a=1&b=2')
    const query = new URLSearchParams(loginUrl.split('?')[1])
    const redirect = safeRedirect(query.get('redirect'))
    const prefill = new URLSearchParams(redirect.split('?')[1]).get('prefill')
    expect(prefill).toBe('https://example.com/campaign?a=1&b=2')
  })

  it('keeps the login redirect same-origin', () => {
    const loginUrl = buildLoginRedirect('https://example.com/x')
    expect(loginUrl.startsWith('/login?redirect=%2F')).toBe(true)
  })
})

describe('ShortenForm prefill', () => {
  it('prefills the destination carried from the marketing hero', async () => {
    const prefill = encodeURIComponent('https://example.com/carried')
    renderWithProviders(<ShortenForm />, { route: `/dashboard?prefill=${prefill}` })
    expect(await screen.findByDisplayValue('https://example.com/carried')).toBeInTheDocument()
  })
})
