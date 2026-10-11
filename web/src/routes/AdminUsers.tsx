import { NavLink } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { UsersTable } from '@/features/admin/UsersTable'
import { cn } from '@/lib/cn'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'border-b-2 pb-2 text-sm transition-colors',
    isActive
      ? 'border-foreground font-bold text-foreground'
      : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
  )

export function AdminNav() {
  return (
    <nav className="flex gap-6 border-b-[0.5px] border-border">
      <NavLink to="/admin/users" className={tabClass}>
        Users
      </NavLink>
      <NavLink to="/admin/links" className={tabClass}>
        Links
      </NavLink>
    </nav>
  )
}

export function AdminUsers() {
  return (
    <PageContainer>
      <AdminNav />
      <UsersTable />
    </PageContainer>
  )
}
