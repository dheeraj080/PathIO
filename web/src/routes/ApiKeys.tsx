import { useState, type FormEvent } from 'react'
import { KeyRound, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '@/features/api-keys/useApiKeys'
import { formatDate, formatDateTime } from '@/lib/format'
import type { ApiKeyDTO } from '@/types/api'

const EXPIRY_OPTIONS = [
  { value: '0', label: 'Never expires' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
] as const

function isExpired(key: ApiKeyDTO): boolean {
  return key.expiresAt != null && new Date(key.expiresAt).getTime() <= Date.now()
}

function statusOf(key: ApiKeyDTO): { tone: 'success' | 'neutral' | 'warning'; label: string } {
  if (!key.active) return { tone: 'neutral', label: 'Revoked' }
  if (isExpired(key)) return { tone: 'warning', label: 'Expired' }
  return { tone: 'success', label: 'Active' }
}

export function ApiKeys() {
  const { data: keys, isLoading } = useApiKeys()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()

  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState<string>('0')
  const [created, setCreated] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<ApiKeyDTO | null>(null)

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const days = Number.parseInt(expiry, 10)
    void createKey
      .mutateAsync({ name: trimmed, expiresInDays: days > 0 ? days : null })
      .then((result) => {
        setCreated(result.key)
        setName('')
        setExpiry('0')
      })
      .catch(() => {
        /* toast already surfaced by the hook */
      })
  }

  const handleRevoke = () => {
    if (!confirming) return
    revokeKey.mutate(confirming.id)
    setConfirming(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Programmatic access with an <code className="text-xs">X-API-Key</code> header. Keys are
          stored as digests, so the plaintext is shown only once — save it when you create it.
        </p>
      </div>

      {created ? (
        <Card className="border-amber-300 dark:border-amber-700/60">
          <CardBody className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Copy your key now — it is shown only once.
                </p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                  Store it somewhere safe; you won&apos;t be able to view it again.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Dismiss API key"
                onClick={() => setCreated(null)}
              >
                Dismiss
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <code
                data-testid="new-api-key"
                className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm dark:bg-slate-900"
              >
                {created}
              </code>
              <CopyButton value={created} ariaLabelDefault="Copy API key" label="Copy" />
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Create a key"
          description="Give the key a name so you can recognise it later."
        />
        <CardBody>
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleCreate}>
            <div className="flex-1">
              <Input
                id="api-key-name"
                name="api-key-name"
                label="Key name"
                placeholder="ci-deploy"
                maxLength={64}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="w-full sm:w-44">
              <label
                htmlFor="api-key-expiry"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Expiry
              </label>
              <select
                id="api-key-expiry"
                name="api-key-expiry"
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" loading={createKey.isPending} disabled={!name.trim()}>
              <Plus className="h-4 w-4" />
              Create API key
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Your API keys" description="Unused or leaked keys can be revoked here." />
        <CardBody>
          {isLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          ) : !keys || keys.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="h-8 w-8" />}
              title="No API keys yet"
              description="Create your first key to start using the API programmatically."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {keys.map((key) => {
                const status = statusOf(key)
                return (
                  <li
                    key={key.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                          {key.name}
                        </span>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Created {formatDate(key.createdAt)} ·{' '}
                        {key.expiresAt ? `Expires ${formatDate(key.expiresAt)}` : 'No expiry'} ·{' '}
                        {key.lastUsedAt
                          ? `Last used ${formatDateTime(key.lastUsedAt)}`
                          : 'Never used'}
                      </p>
                    </div>
                    {key.active ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Revoke ${key.name}`}
                        onClick={() => setConfirming(key)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirming !== null}
        title="Revoke API key"
        description={
          confirming
            ? `Applications using "${confirming.name}" will immediately lose access. This cannot be undone.`
            : undefined
        }
        confirmLabel="Revoke key"
        pending={revokeKey.isPending}
        onConfirm={handleRevoke}
        onClose={() => setConfirming(null)}
      />
    </div>
  )
}
