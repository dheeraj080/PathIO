import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser } from '@/api/users.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/lib/errors'

export function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: () => createUser({ name, email, password }),
    onSuccess: () => {
      toast.push('User created', 'success')
      setName('')
      setEmail('')
      setPassword('')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      onClose()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create user"
      description="New users are created with the ROLE_USER role."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-user-form" loading={isPending}>
            Create
          </Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
          hint="At least 8 characters."
        />
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </form>
    </Modal>
  )
}
