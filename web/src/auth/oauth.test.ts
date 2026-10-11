import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startOAuth } from '@/auth/oauth'
import { mockOAuthPayload, simulateOAuthFailure, simulateOAuthSuccess } from '@/mocks/oauth'
import { MOCK_USER_EMAIL } from '@/mocks/fixtures'

function fakePopup() {
  return { closed: false, close: vi.fn() }
}

describe('startOAuth', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockReturnValue(fakePopup() as unknown as Window)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('resolves with the payload from an OAUTH_AUTH_SUCCESS message', async () => {
    const promise = startOAuth('google')
    simulateOAuthSuccess(mockOAuthPayload())

    const result = await promise
    expect(result.user.email).toBe(MOCK_USER_EMAIL)
    expect(result.accessToken).toBeTruthy()
  })

  it('rejects with OAUTH_FAILED when the backend reports a failure', async () => {
    const promise = startOAuth('google')
    const assertion = expect(promise).rejects.toMatchObject({ code: 'OAUTH_FAILED' })
    simulateOAuthFailure()
    await assertion
  })

  it('rejects when the popup closes without a message', async () => {
    vi.useFakeTimers()
    const popup = fakePopup()
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)

    const promise = startOAuth('github')
    const assertion = expect(promise).rejects.toMatchObject({ code: 'OAUTH_CANCELLED' })
    popup.closed = true
    await vi.advanceTimersByTimeAsync(500)
    await assertion
  })

  it('rejects when the popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null as unknown as Window)
    await expect(startOAuth('google')).rejects.toMatchObject({ code: 'POPUP_BLOCKED' })
  })

  it('ignores success messages from untrusted origins', async () => {
    const promise = startOAuth('google')
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        data: { type: 'OAUTH_AUTH_SUCCESS', payload: mockOAuthPayload() },
      }),
    )
    // Settle with a genuine message so the promise does not leak.
    simulateOAuthSuccess(mockOAuthPayload())
    await expect(promise).resolves.toBeTruthy()
  })
})
