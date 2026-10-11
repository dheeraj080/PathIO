import { setupWorker } from 'msw/browser'
import { handlers } from '@/mocks/handlers'

/** MSW browser worker used when VITE_USE_MOCKS=true. */
export const worker = setupWorker(...handlers)
