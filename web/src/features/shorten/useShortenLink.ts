import { useMutation, useQueryClient } from '@tanstack/react-query'
import { shorten } from '@/api/urls.api'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/lib/errors'

export interface ShortenVars {
  longUrl: string
  alias?: string
}

/**
 * Shared mutation for creating a short link.
 *
 * Owns the success/error toasts and the cache invalidations so every call site
 * (dashboard form, marketing hero) stays consistent and business logic lives in
 * exactly one place. Callers may pass per-call `onSuccess`/`onError` options to
 * React Query's `mutate` for local UI state.
 */
export function useShortenLink() {
  const toast = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vars: ShortenVars) => shorten(vars.longUrl, vars.alias),
    onSuccess: () => {
      toast.push('Short link created', 'success')
      void queryClient.invalidateQueries({ queryKey: ['urls', 'me'] })
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'overview'] })
    },
    onError: (error) => toast.push(getErrorMessage(error), 'error'),
  })
}
