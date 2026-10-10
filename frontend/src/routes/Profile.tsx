import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BadgeCheck } from 'lucide-react'
import { updateUser } from '@/api/users.api'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/auth/useAuth'
import { getErrorMessage } from '@/lib/errors'

export function Profile() {
  const { user, reload } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [error, setError] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: () => updateUser(user!.id, { name }),
    onSuccess: async () => {
      toast.push('Profile updated', 'success')
      await reload()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    mutate()
  }

  if (!user) return null

  const provider = user.provider ?? 'LOCAL'

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <Card>
        <CardBody className="flex items-center gap-4">
          <Avatar name={user.name} image={user.image} size={56} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-lg font-semibold">
              {user.name ?? 'Unnamed user'}
              <BadgeCheck className="h-4 w-4 text-brand-500" />
            </p>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            <Badge tone="neutral" className="mt-1">
              {provider}
            </Badge>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Edit profile" description="Update your display name." />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Display name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={error}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
