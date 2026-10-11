import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, Link2, Trash2 } from 'lucide-react'
import { adminDeleteUrl, listAllUrls } from '@/api/admin.api'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/lib/errors'
import { displayUrl, formatCount, formatDate } from '@/lib/format'
import type { UserUrlResponse } from '@/types/api'

const PAGE_SIZE = 15

export function AllLinksTable() {
  const queryClient = useQueryClient()
  const toast = useToast()
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

  return (
    <Card>
      <CardHeader title="All links" description="Every short link across all accounts." />

      {isLoading ? (
        <CardBody>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading links…</p>
        </CardBody>
      ) : isError ? (
        <CardBody>
          <p className="text-sm text-red-600 dark:text-red-400">{getErrorMessage(error)}</p>
        </CardBody>
      ) : !data || data.content.length === 0 ? (
        <CardBody>
          <EmptyState icon={<Link2 className="h-8 w-8" />} title="No links yet" />
        </CardBody>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Short code</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Destination</th>
                  <th className="px-5 py-3 font-medium">Clicks</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">Created</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.content.map((url) => (
                  <tr key={url.shortCode} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-5 py-3 font-mono text-xs">/{url.shortCode}</td>
                    <td className="hidden max-w-xs px-5 py-3 md:table-cell">
                      <span className="truncate text-slate-600 dark:text-slate-300" title={url.longUrl}>
                        {displayUrl(url.longUrl, 44)}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{formatCount(url.clickCount)}</td>
                    <td className="hidden px-5 py-3 text-slate-500 lg:table-cell dark:text-slate-400">
                      {formatDate(url.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <CopyButton value={url.shortUrl} label="" className="px-2" />
                        <Link to={`/links/${url.shortCode}`} aria-label={`Analytics for ${url.shortCode}`}>
                          <Button variant="ghost" size="sm" className="px-2">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          aria-label={`Delete ${url.shortCode}`}
                          onClick={() => setDeleting(url)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5">
            <Pagination
              page={data.number}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              onChange={setPage}
            />
          </div>
        </>
      )}

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
    </Card>
  )
}
