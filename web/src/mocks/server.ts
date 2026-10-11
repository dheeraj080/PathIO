import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'

/** MSW server used by Vitest (Node/jsdom). */
export const server = setupServer(...handlers)
