import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { UrlAnalyticsPanel } from '@/features/analytics/UrlAnalyticsPanel'

export function LinkDetail() {
  const { shortCode = '' } = useParams<{ shortCode: string }>()
  const navigate = useNavigate()

  return (
    <PageContainer>
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Button>
      </div>
      <UrlAnalyticsPanel shortCode={shortCode} />
    </PageContainer>
  )
}
