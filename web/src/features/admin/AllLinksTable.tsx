import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, Link2, Trash2 } from 'lucide-react'
import { adminDeleteUrl, listAllUrls } from '@/api/admin.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { LinkCardSkeletonList } from '@/features/links/LinkCardSkeleton'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/lib/errors'
import { displayUrl, formatCount, formatDate } from '@/lib/format'
import type { UserUrlResponse } from '@/types/api'

const PAGE_SIZE = 15

export function AllLinksTable() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [deleting, setDeleting] = useState<UserUrlResponse | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'links', page, PAGE_SIZE],
    queryFn: () => listAllUrls(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useMutation({
    mutationFn: (shortCode: string) => adminDeleteUrl(shortCode),
    onSuccess: () => {
      toast.push('Link deleted', 'success')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'links'] })
    },
    onError: (err) => toast.push(getErrorMessage(err), 'error'),
  })

  if (isLoading) return <LinkCardSkeletonList />

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      </div>
    )
  }

  if (!data || data.content.length === 0) {
    return <EmptyState icon={<Link2 className="size-6" />} title="No links yet" />
  }

  return (
    <div className="flex flex-col gap-3">
      {data.content.map((url) => (
        <div
          key={url.shortCode}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-soft md:p-5"
        >
          <div className="min-w-0 flex-1">
            <Link
              to={`/links/${url.shortCode}`}
              className="block truncate text-sm font-semibold text-foreground hover:underline"
              title={url.longUrl}
            >
              {displayUrl(url.longUrl, 70)}
            </Link>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">/{url.shortCode}</span>
              <span aria-hidden="true">•</span>
              <span className="truncate">Created {formatDate(url.createdAt)}</span>
            </div>
          </div>
          <Badge tone="neutral" className="hidden shrink-0 tabular-nums sm:inline-flex">
            {formatCount(url.clickCount)} clicks
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Analytics for ${url.shortCode}`}
            onClick={() => navigate(`/links/${url.shortCode}`)}
          >
            <BarChart3 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10"
            aria-label={`Delete ${url.shortCode}`}
            onClick={() => setDeleting(url)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <Pagination
        page={data.number}
        totalPages={data.totalPages}
        totalElements={data.totalElements}
        onChange={setPage}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this link?"
        description={deleting ? `/${deleting.shortCode} will stop redirecting immediately.` : undefined}
        confirmLabel="Delete"
        pending={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.shortCode)
        }}
      />
    </div>
  )
}
