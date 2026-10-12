import { useNavigate } from 'react-router-dom'
import { CopyShortLinkButton } from '@/features/links/CopyShortLinkButton'
import { LinkActionsMenu } from '@/features/links/LinkActionsMenu'
import { displayUrl, formatCount, formatDate } from '@/lib/format'
import type { UserUrlResponse } from '@/types/api'

interface LinkCardProps {
  url: UserUrlResponse
  onEdit?: (url: UserUrlResponse) => void
  onDelete?: (url: UserUrlResponse) => void
}

/** Stacked row presentation of a single short link — the dashboard's mobile view. */
export function LinkCard({ url, onEdit, onDelete }: LinkCardProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-start gap-3 py-4">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => navigate(`/links/${url.shortCode}`)}
          className="block w-full truncate text-left text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          title={url.longUrl}
        >
          {displayUrl(url.longUrl, 70)}
        </button>

        <div className="mt-1.5 flex min-w-0 items-center gap-3">
          <span className="truncate font-mono text-xs text-muted-foreground">
            /{url.shortCode}
          </span>
          <CopyShortLinkButton shortUrl={url.shortUrl} shortCode={url.shortCode} />
        </div>

        <p className="mt-1.5 text-xs text-muted-foreground">
          <span className="tnum font-medium text-foreground">{formatCount(url.clickCount)}</span>{' '}
          clicks · {formatDate(url.createdAt)}
        </p>
      </div>

      <LinkActionsMenu url={url} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
