import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { CopyShortLinkButton } from '@/features/links/CopyShortLinkButton'
import { LinkActionsMenu } from '@/features/links/LinkActionsMenu'
import { displayUrl, formatCount } from '@/lib/format'
import type { UserUrlResponse } from '@/types/api'

interface LinkCardProps {
  url: UserUrlResponse
  onEdit?: (url: UserUrlResponse) => void
  onDelete?: (url: UserUrlResponse) => void
}

/** Card-row presentation of a single short link — the dashboard's mobile view. */
export function LinkCard({ url, onEdit, onDelete }: LinkCardProps) {
  const navigate = useNavigate()

  return (
    <div className="group flex items-center gap-4 rounded-xl border-[0.5px] border-border bg-card p-4 transition-shadow hover:shadow-soft md:p-5">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => navigate(`/links/${url.shortCode}`)}
          className="block max-w-full truncate text-left text-sm font-semibold text-foreground hover:underline"
          title={url.longUrl}
        >
          {displayUrl(url.longUrl, 70)}
        </button>

        <div className="mt-1 flex min-w-0 items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
            <span className="truncate font-mono text-xs text-muted-foreground">/{url.shortCode}</span>
          </span>
          <CopyShortLinkButton shortUrl={url.shortUrl} shortCode={url.shortCode} />
        </div>
      </div>

      <Badge tone="neutral" className="hidden shrink-0 tabular-nums sm:inline-flex">
        {formatCount(url.clickCount)} clicks
      </Badge>

      <LinkActionsMenu url={url} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}