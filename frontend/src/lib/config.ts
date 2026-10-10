const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

/** Backend base URL with any trailing slash removed. */
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

/** Origin of the backend, used to validate OAuth popup `postMessage` events. */
export const API_ORIGIN = new URL(API_BASE_URL).origin

/** When true, the MSW browser worker is started for manual dev. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
