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

/**
 * Desktop link table. Rows are separated by hairlines with no heavy header bar —
 * the column labels are quiet mono caps.
 */
export function LinksTable({ items, onEdit, onDelete }: LinksTableProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[32%]" />
          <col className="w-[26%]" />
          <col className="w-[11%]" />
          <col className="w-[17%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <th className="border-b border-border px-4 py-3 font-medium">Original URL</th>
            <th className="border-b border-border px-2 py-3 font-medium">Short link</th>
            <th className="border-b border-border px-2 py-3 text-right font-medium">Clicks</th>
            <th className="border-b border-border px-2 py-3 font-medium">Created</th>
            <th className="border-b border-border px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((url) => (
            <tr key={url.shortCode} className="transition-colors hover:bg-foreground/[0.03]">
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => navigate(`/links/${url.shortCode}`)}
                  className="block w-full truncate text-left font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                  title={url.longUrl}
                >
                  {displayUrl(url.longUrl, 60)}
                </button>
              </td>
              <td className="px-2 py-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate font-mono text-muted-foreground">
                    /{url.shortCode}
                  </span>
                  <CopyShortLinkButton shortUrl={url.shortUrl} shortCode={url.shortCode} />
                </span>
              </td>
              <td className="tnum px-2 py-3 text-right font-medium text-foreground">
                {formatCount(url.clickCount)}
              </td>
              <td className="px-2 py-3 text-muted-foreground">{formatDate(url.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <LinkActionsMenu url={url} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
