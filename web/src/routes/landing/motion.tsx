// The landing page's motion helpers now live in `@/lib/motion` so the
// authenticated app can reuse them without a second implementation. This module
// only re-exports them to keep the existing `@/routes/landing/motion` import
// path stable.
export { Counter, Reveal, prefersReducedMotion, useInView } from '@/lib/motion'
