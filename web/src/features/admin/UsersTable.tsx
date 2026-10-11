import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, Trash2, UserPlus, Users2 } from 'lucide-react'
import { deleteUser, listUsers } from '@/api/users.api'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { CreateUserDialog } from '@/features/admin/CreateUserDialog'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import type { UserDTO } from '@/types/api'

export function UsersTable() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user: currentUser } = useAuth()
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<UserDTO | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: listUsers,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.push('User deleted', 'success')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err) => toast.push(getErrorMessage(err), 'error'),
  })

  return (
    <Card>
      <CardHeader
        title="Users"
        description="All registered accounts."
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <UserPlus className="h-4 w-4" />
            Create user
          </Button>
        }
      />

      {isLoading ? (
        <CardBody>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading users…</p>
        </CardBody>
      ) : isError ? (
        <CardBody>
          <p className="text-sm text-red-600 dark:text-red-400">{getErrorMessage(error)}</p>
        </CardBody>
      ) : !data || data.length === 0 ? (
        <CardBody>
          <EmptyState icon={<Users2 className="h-8 w-8" />} title="No users found" />
        </CardBody>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Provider</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Roles</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">Created</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map((user) => {
                const isSelf = currentUser?.id === user.id
                return (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} image={user.image} size={32} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                            {user.name ?? '—'}
                            {isSelf ? <span className="ml-1 text-xs text-slate-400">(you)</span> : null}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="neutral">{user.provider ?? 'LOCAL'}</Badge>
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(user.roles ?? []).map((role) => (
                          <Badge key={role.id ?? role.name} tone={role.name === 'ROLE_ADMIN' ? 'brand' : 'neutral'}>
                            {role.name === 'ROLE_ADMIN' ? (
                              <Shield className="mr-1 h-3 w-3" />
                            ) : null}
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-slate-500 lg:table-cell dark:text-slate-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        aria-label={`Delete ${user.email}`}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot delete your own account' : undefined}
                        onClick={() => setDeleting(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateUserDialog open={creating} onClose={() => setCreating(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this user?"
        description={
          deleting ? `${deleting.email} will be permanently removed. This cannot be undone.` : undefined
        }
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
      />
    </Card>
  )
}
