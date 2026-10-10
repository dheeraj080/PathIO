import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { UrlAnalyticsPanel } from '@/features/analytics/UrlAnalyticsPanel'
import { Button } from '@/components/ui/Button'

export function LinkDetail() {
  const { shortCode = '' } = useParams<{ shortCode: string }>()

  return (
    <div className="space-y-6">
      <Link to="/dashboard">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Button>
      </Link>
      <UrlAnalyticsPanel shortCode={shortCode} />
    </div>
  )
}
