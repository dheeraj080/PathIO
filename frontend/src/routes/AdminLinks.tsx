import { AllLinksTable } from '@/features/admin/AllLinksTable'
import { AdminNav } from '@/routes/AdminUsers'

export function AdminLinks() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
        <AdminNav />
      </div>
      <AllLinksTable />
    </div>
  )
}
