import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createApiKey, listApiKeys, revokeApiKey } from '@/api/apiKeys.api'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/lib/errors'
import type { CreateApiKeyResult } from '@/types/api'

/** Cache key for the current user's API-key list. */
export const apiKeysQueryKey = ['api-keys'] as const

export interface CreateApiKeyVars {
  name: string
  expiresInDays?: number | null
}

/** The current user's API keys (metadata only). */
export function useApiKeys() {
  return useQuery({
    queryKey: apiKeysQueryKey,
    queryFn: listApiKeys,
  })
}

/**
 * Mints a key. Resolves with the plaintext-once result so the caller can surface
 * it immediately; the cache is refreshed so the new key appears in the list.
 */
export function useCreateApiKey() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<CreateApiKeyResult, unknown, CreateApiKeyVars>({
    mutationFn: (vars) => createApiKey(vars),
    onSuccess: () => {
      toast.push('API key created', 'success')
      void queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })
    },
    onError: (error) => toast.push(getErrorMessage(error), 'error'),
  })
}

/** Revokes a key; the list is refreshed so the row flips to revoked. */
export function useRevokeApiKey() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation<void, unknown, number>({
    mutationFn: (id) => revokeApiKey(id),
    onSuccess: () => {
      toast.push('API key revoked', 'success')
      void queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })
    },
    onError: (error) => toast.push(getErrorMessage(error), 'error'),
  })
}
