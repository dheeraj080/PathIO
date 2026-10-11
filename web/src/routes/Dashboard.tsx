import { useRef } from 'react'
import { OverviewCards } from '@/features/analytics/OverviewCards'
import { FirstLinkNudge } from '@/features/links/FirstLinkNudge'
import { LinksTable } from '@/features/links/LinksTable'
import { ShortenForm } from '@/features/shorten/ShortenForm'
import { useAuth } from '@/auth/useAuth'

export function Dashboard() {
  const { user } = useAuth()
  const shortenInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Welcome back{user?.name ? `, ${user.name}` : ''}.
        </p>
      </div>

      <FirstLinkNudge onStart={() => shortenInputRef.current?.focus()} />
      <ShortenForm inputRef={shortenInputRef} />
      <OverviewCards />
      <LinksTable />
    </div>
  )
}
