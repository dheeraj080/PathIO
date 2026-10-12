import { useRef } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { OverviewCards } from '@/features/analytics/OverviewCards'
import { FirstLinkNudge } from '@/features/links/FirstLinkNudge'
import { LinkList } from '@/features/links/LinkList'
import { ShortenForm } from '@/features/shorten/ShortenForm'
import { useAuth } from '@/auth/useAuth'

export function Dashboard() {
  const { user } = useAuth()
  const shortenInputRef = useRef<HTMLInputElement>(null)

  return (
    <PageContainer className="gap-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Welcome back{user?.name ? `, ${user.name}` : ''}
      </p>

      <FirstLinkNudge onStart={() => shortenInputRef.current?.focus()} />

      <ShortenForm inputRef={shortenInputRef} />

      <OverviewCards />

      <LinkList />
    </PageContainer>
  )
}
