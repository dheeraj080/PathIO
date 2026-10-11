import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { getTopLinks } from '@/api/analytics.api'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { CopyShortLinkButton } from '@/features/links/CopyShortLinkButton'
import { displayUrl, formatCount } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'

/** The account's most-clicked links, ranked and linking to each link's analytics. */
export function TopLinksList({ limit = 5 }: { limit?: number }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics', 'top-links', limit],
    queryFn: () => getTopLinks(limit),
  })

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b-[0.5px] border-border px-5 py-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Trophy className="size-4 text-primary" />
          Top links
        </h3>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          By clicks
        </span>
      </div>

      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <Spinner className="h-5 w-5" />
          </div>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : !data || data.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No clicks yet. Share a short link to see it here.
          </p>
        ) : (
          data.map((link, index) => (
            <div
              key={link.shortCode}
              className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-accent/50"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border-[0.5px] border-border bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/links/${link.shortCode}`}
                  className="block truncate font-mono text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  title={link.longUrl}
                >
                  /{link.shortCode}
                </Link>
                <p className="truncate text-xs text-muted-foreground" title={link.longUrl}>
                  {displayUrl(link.longUrl, 60)}
                </p>
              </div>
              <CopyShortLinkButton shortUrl={link.shortUrl} shortCode={link.shortCode} />
              <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums text-foreground">
                {formatCount(link.clickCount)}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}