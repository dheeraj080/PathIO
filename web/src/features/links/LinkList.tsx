import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownUp, Check, Plus, RefreshCw, Search } from 'lucide-react'
import { deleteUrl } from '@/api/urls.api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pagination } from '@/components/ui/Pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { LinkCard } from '@/features/links/LinkCard'
import { LinkCardSkeletonList } from '@/features/links/LinkCardSkeleton'
import { LinksTable } from '@/features/links/LinksTable'
import { EmptyLinksState } from '@/features/links/EmptyLinksState'
import { EditLinkDialog } from '@/features/links/EditLinkDialog'
import { useLinkWindow } from '@/features/links/useLinkWindow'
import { useToast } from '@/components/ui/Toast'
import { requestCreateLink } from '@/lib/events'
import { getErrorMessage } from '@/lib/errors'
import type { UserUrlResponse } from '@/types/api'

const PAGE_SIZE = 10

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'clicks-desc', label: 'Most clicks' },
  { value: 'clicks-asc', label: 'Least clicks' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['value']
const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  'clicks-desc': 'Most clicks',
  'clicks-asc': 'Least clicks',
}

export function LinkList() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortKey>('newest')
  const [editing, setEditing] = useState<UserUrlResponse | null>(null)
  const [deleting, setDeleting] = useState<UserUrlResponse | null>(null)

  const { data, isLoading, isError, error } = useLinkWindow()

  const deleteMutation = useMutation({
    mutationFn: (shortCode: string) => deleteUrl(shortCode),
    onSuccess: () => {
      toast.push('Link deleted', 'success')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['urls', 'me'] })
      void queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (err) => toast.push(getErrorMessage(err), 'error'),
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['urls', 'me'] })
    void queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  const clearSearch = () => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('q')
        return next
      },
      { replace: true },
    )
  }

  const query = search.trim().toLowerCase()
  const links = data?.content ?? []

  const filtered = useMemo(() => {
    const list = query
      ? links.filter(
          (url) =>
            url.longUrl.toLowerCase().includes(query) ||
            url.shortCode.toLowerCase().includes(query) ||
            url.shortUrl.toLowerCase().includes(query),
        )
      : links

    const sorted = [...list]
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        break
      case 'clicks-desc':
        sorted.sort((a, b) => b.clickCount - a.clickCount)
        break
      case 'clicks-asc':
        sorted.sort((a, b) => a.clickCount - b.clickCount)
        break
      default:
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return sorted
  }, [links, query, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const capped = (data?.totalElements ?? 0) > links.length
  const caption = query
    ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}`
    : capped
      ? `${filtered.length} of ${data?.totalElements ?? 0} shown`
      : `${data?.totalElements ?? 0} links`

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader count={undefined} />
        <Card className="overflow-hidden">
          <Toolbar sort={sort} onChangeSort={setSort} caption="" onRefresh={refresh} />
          <div className="p-4">
            <LinkCardSkeletonList />
          </div>
        </Card>
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="p-6">
        <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
      </Card>
    )
  }

  if (!data || data.content.length === 0) {
    return <EmptyLinksState />
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader count={data.totalElements} />

      <Card className="overflow-hidden">
        <Toolbar sort={sort} onChangeSort={setSort} caption={caption} onRefresh={refresh} />

        {pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl border-[0.5px] border-border bg-muted text-muted-foreground">
              <Search className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold text-foreground">No links found</p>
              <p className="text-sm text-muted-foreground">
                Nothing matches “{search.trim()}”. Try a different URL or alias.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={clearSearch}>
              Clear search
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <LinksTable items={pageItems} onEdit={setEditing} onDelete={setDeleting} />
            </div>
            <div className="flex flex-col gap-3 p-4 md:hidden">
              {pageItems.map((url) => (
                <LinkCard
                  key={url.shortCode}
                  url={url}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          </>
        )}

        <div className="border-t-[0.5px] border-border px-4 py-3">
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalElements={filtered.length}
            onChange={setPage}
          />
        </div>
      </Card>

      {editing ? (
        <EditLinkDialog
          key={editing.shortCode}
          url={editing}
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this link?"
        description={
          deleting
            ? `/${deleting.shortCode} will stop redirecting immediately. This cannot be undone.`
            : undefined
        }
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

function SectionHeader({ count }: { count: number | undefined }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Your links</h2>
        <p className="text-sm text-muted-foreground">
          {count === undefined ? 'Loading…' : `${count} total`}
        </p>
      </div>
      <Button type="button" onClick={() => requestCreateLink()}>
        <Plus className="size-4" />
        New link
      </Button>
    </div>
  )
}

function Toolbar({
  sort,
  onChangeSort,
  caption,
  onRefresh,
}: {
  sort: SortKey
  onChangeSort: (value: SortKey) => void
  caption: string
  onRefresh?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b-[0.5px] border-border px-4 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Sort links"
          className="flex h-8 items-center gap-1.5 rounded-md border-[0.5px] border-input bg-background px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <ArrowDownUp className="size-3.5" />
          {SORT_LABELS[sort]}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuItem key={option.value} onSelect={() => onChangeSort(option.value)}>
              {option.label}
              {sort === option.value ? <Check className="ml-auto size-4" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}

      {onRefresh ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh links"
          className="ml-auto"
          onClick={onRefresh}
        >
          <RefreshCw className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}