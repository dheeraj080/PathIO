import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { FullPageLoading } from '@/components/auth/guards'
import { useDocumentMetadata } from '@/lib/useDocumentMetadata'
import { Hero } from '@/routes/landing/sections/Hero'
import { Story } from '@/routes/landing/sections/Story'
import { Features } from '@/routes/landing/sections/Features'
import { HowItWorks } from '@/routes/landing/sections/HowItWorks'
import { UseCases } from '@/routes/landing/sections/UseCases'
import { Faq } from '@/routes/landing/sections/Faq'
import { FinalCta } from '@/routes/landing/sections/FinalCta'

/**
 * Landing page — editorial "ledger" concept: oversized serif type, thin rules,
 * monospace data details, and one ember accent. The dashboard is untouched.
 */
export function Landing() {
  const { status } = useAuth()

  useDocumentMetadata({
    title: 'PathIO — Shorten the link. Keep the story.',
    description:
      'PathIO turns long URLs into compact, persistent short links — with total and unique clicks, day-by-day history, referrer domains, and device breakdowns for every link.',
  })

  if (status === 'loading') return <FullPageLoading />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />

  return (
    <>
      <Hero />
      <Story />
      <Features />
      <HowItWorks />
      <UseCases />
      <Faq />
      <FinalCta />
    </>
  )
}