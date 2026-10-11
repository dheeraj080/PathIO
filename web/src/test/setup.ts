import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '@/mocks/server'
import { resetMockData } from '@/mocks/store'
import { tokenStore } from '@/lib/tokenStore'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  resetMockData()
  tokenStore.set(null)
  document.cookie = 'refresh_token=; path=/; max-age=0'
  cleanup()
})

afterAll(() => {
  server.close()
})
