import { apiRequest } from '@/lib/api'
import type { ApiKeyDTO, CreateApiKeyRequest, CreateApiKeyResult } from '@/types/api'

/** List the current user's API keys (metadata only — digests are never exposed). */
export function listApiKeys(): Promise<ApiKeyDTO[]> {
  return apiRequest<ApiKeyDTO[]>('/api/v1/api-keys')
}

/** Create an API key. The plaintext `key` in the result is shown exactly once. */
export function createApiKey(input: CreateApiKeyRequest): Promise<CreateApiKeyResult> {
  return apiRequest<CreateApiKeyResult>('/api/v1/api-keys', {
    method: 'POST',
    body: {
      name: input.name,
      expiresInDays: input.expiresInDays ?? null,
    },
  })
}

/** Soft-revoke an API key; it immediately stops authenticating requests. */
export function revokeApiKey(id: number): Promise<void> {
  return apiRequest<void>(`/api/v1/api-keys/${id}`, { method: 'DELETE' })
}
