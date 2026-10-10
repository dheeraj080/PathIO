import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUrl } from '@/api/urls.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { isValidHttpUrl } from '@/features/shorten/ShortenForm'
import { getErrorMessage } from '@/lib/errors'
import type { UserUrlResponse } from '@/types/api'

export function EditLinkDialog({
  url,
  open,
  onClose,
}: {
  url: UserUrlResponse
  open: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [longUrl, setLongUrl] = useState(url.longUrl)
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: (value: string) => updateUrl(url.shortCode, value),
    onSuccess: () => {
      toast.push('Destination updated', 'success')
      void queryClient.invalidateQueries({ queryKey: ['urls', 'me'] })
      void queryClient.invalidateQueries({ queryKey: ['analytics'] })
      onClose()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const validationError = touched && !isValidHttpUrl(longUrl.trim()) ? 'Enter a valid http(s) URL.' : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    setError(null)
    const value = longUrl.trim()
    if (!isValidHttpUrl(value)) return
    mutate(value)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit destination"
      description={`/${url.shortCode}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="edit-link-form" loading={isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id="edit-link-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Destination URL"
          name="longUrl"
          value={longUrl}
          onChange={(event) => setLongUrl(event.target.value)}
          onBlur={() => setTouched(true)}
          error={validationError ?? error}
          autoFocus
        />
      </form>
    </Modal>
  )
}
