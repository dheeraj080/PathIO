import { useNavigate } from 'react-router-dom'
import { LinkActionsMenu } from '@/features/links/LinkActionsMenu'
import { CopyShortLinkButton } from '@/features/links/CopyShortLinkButton'
import { displayUrl, formatCount, formatDate } from '@/lib/format'
import type { UserUrlResponse } from '@/types/api'

interface LinksTableProps {
  items: UserUrlResponse[]
  onEdit: (url: UserUrlResponse) => void
  onDelete: (url: UserUrlResponse) => void
}

/** Compact desktop table for the dashboard link list. */
export function LinksTable({ items, onEdit, onDelete }: LinksTableProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[32%]" />
          <col className="w-[28%]" />
          <col className="w-[11%]" />
          <col className="w-[17%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 font-medium">Original URL</th>
            <th className="px-1 py-3 font-medium">Short link</th>
            <th className="px-1 py-3 font-medium">Clicks</th>
            <th className="px-1 py-3 font-medium">Created</th>
            <th className="px-5 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((url) => (
            <tr key={url.shortCode} className="group transition-colors hover:bg-accent/50">
              <td className="px-5 py-3">
                <button
                  type="button"
                  onClick={() => navigate(`/links/${url.shortCode}`)}
                  className="block w-full truncate text-left text-foreground transition-colors hover:text-primary"
                  title={url.longUrl}
                >
                  {displayUrl(url.longUrl, 60)}
                </button>
              </td>
              <td className="px-1 py-3">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="min-w-0 truncate font-mono text-muted-foreground">
                    /{url.shortCode}
                  </span>
                  <CopyShortLinkButton shortUrl={url.shortUrl} shortCode={url.shortCode} />
                </span>
              </td>
              <td className="px-1 py-3 tabular-nums text-muted-foreground">
                {formatCount(url.clickCount)}
              </td>
              <td className="px-1 py-3 text-muted-foreground">{formatDate(url.createdAt)}</td>
              <td className="px-5 py-3 text-right">
                <LinkActionsMenu url={url} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}