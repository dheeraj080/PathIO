import { PageContainer } from '@/components/layout/PageContainer'
import { AllLinksTable } from '@/features/admin/AllLinksTable'
import { AdminNav } from '@/routes/AdminUsers'

export function AdminLinks() {
  return (
    <PageContainer>
      <AdminNav />
      <AllLinksTable />
    </PageContainer>
  )
}
