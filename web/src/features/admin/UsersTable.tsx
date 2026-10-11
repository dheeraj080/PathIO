import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, Trash2, UserPlus, Users2 } from 'lucide-react'
import { deleteUser, listUsers } from '@/api/users.api'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.length} registered ${data.length === 1 ? 'account' : 'accounts'}` : 'Registered accounts'}
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <UserPlus className="size-4" />
          Create user
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-xl border-[0.5px] border-border bg-card p-4 md:p-5"
            >
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border-[0.5px] border-border bg-card p-6">
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={<Users2 className="size-6" />} title="No users found" />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((user) => {
            const isSelf = currentUser?.id === user.id
            return (
              <div
                key={user.id}
                className="flex items-center gap-4 rounded-xl border-[0.5px] border-border bg-card p-4 transition-shadow hover:shadow-soft md:p-5"
              >
                <Avatar name={user.name} image={user.image} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user.name ?? '—'}
                    {isSelf ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>

                <div className="hidden flex-wrap gap-1 md:flex">
                  {(user.roles ?? []).map((role) => (
                    <Badge
                      key={role.id ?? role.name}
                      tone={role.name === 'ROLE_ADMIN' ? 'brand' : 'neutral'}
                    >
                      {role.name === 'ROLE_ADMIN' ? <Shield className="mr-1 size-3" /> : null}
                      {role.name}
                    </Badge>
                  ))}
                </div>

                <Badge tone="neutral" className="hidden shrink-0 lg:inline-flex">
                  {user.provider ?? 'LOCAL'}
                </Badge>
                <span className="hidden shrink-0 text-xs text-muted-foreground xl:inline">
                  {formatDate(user.createdAt)}
                </span>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10"
                  aria-label={`Delete ${user.email}`}
                  disabled={isSelf}
                  title={isSelf ? 'You cannot delete your own account' : undefined}
                  onClick={() => setDeleting(user)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )
          })}
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
    </div>
  )
}
