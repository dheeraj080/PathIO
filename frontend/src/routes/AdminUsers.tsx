import { Link, NavLink } from 'react-router-dom'
import { UsersTable } from '@/features/admin/UsersTable'
import { cn } from '@/lib/cn'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-1.5 text-sm font-medium',
    isActive
      ? 'bg-brand-600 text-white'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
  )

export function AdminNav() {
  return (
    <div className="flex gap-2">
      <NavLink to="/admin/users" className={tabClass}>
        Users
      </NavLink>
      <NavLink to="/admin/links" className={tabClass}>
        Links
      </NavLink>
    </div>
  )
}

export function AdminUsers() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
        <AdminNav />
      </div>
      <UsersTable />
      <p className="text-xs text-slate-400">
        Looking for all links? <Link to="/admin/links" className="text-brand-600 hover:underline">View all links</Link>.
      </p>
    </div>
  )
}
