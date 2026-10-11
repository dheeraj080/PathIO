import { useQuery } from '@tanstack/react-query'
import { Link2, MousePointerClick } from 'lucide-react'
import type { ReactNode } from 'react'
import { getOverview } from '@/api/analytics.api'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatCount } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: ReactNode
  label: string
  value: number | undefined
  loading: boolean
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        {icon}
      </span>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {loading ? <Spinner className="h-5 w-5" /> : formatCount(value ?? 0)}
        </p>
      </div>
    </Card>
  )
}

export function OverviewCards() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: getOverview,
  })

  if (isError) {
    return (
      <Card className="p-5">
        <p className="text-sm text-red-600 dark:text-red-400">{getErrorMessage(error)}</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        icon={<Link2 className="h-5 w-5" />}
        label="Total links"
        value={data?.totalUrls}
        loading={isLoading}
      />
      <StatCard
        icon={<MousePointerClick className="h-5 w-5" />}
        label="Total clicks"
        value={data?.totalClicks}
        loading={isLoading}
      />
    </div>
  )
}
