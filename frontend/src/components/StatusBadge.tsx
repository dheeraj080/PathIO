import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { getHealth } from '@/api/health.api'
import { Badge } from '@/components/ui/Badge'

export function StatusBadge() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: false,
  })

  const up = !isError && data?.status?.toUpperCase() === 'UP'

  return (
    <Badge tone={isLoading ? 'neutral' : up ? 'success' : 'danger'} className="gap-1">
      <Activity className="h-3 w-3" />
      {isLoading ? 'Checking API' : up ? 'API online' : 'API offline'}
    </Badge>
  )
}
