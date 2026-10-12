import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTopLinks } from '@/api/analytics.api'
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
    <section className="border-t border-border pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Top links
        </h3>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
          By clicks
        </span>
      </div>

      <div className="mt-2 divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-5 w-5" />
          </div>
        ) : isError ? (
          <p className="py-6 text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : !data || data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No clicks yet. Share a short link to see it here.
          </p>
        ) : (
          data.map((link, index) => (
            <div key={link.shortCode} className="flex items-center gap-4 py-3">
              <span className="tnum w-6 shrink-0 font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/links/${link.shortCode}`}
                  className="block truncate font-mono text-sm text-foreground underline-offset-4 hover:text-primary hover:underline"
                  title={link.longUrl}
                >
                  /{link.shortCode}
                </Link>
                <p className="truncate text-xs text-muted-foreground" title={link.longUrl}>
                  {displayUrl(link.longUrl, 60)}
                </p>
              </div>
              <CopyShortLinkButton shortUrl={link.shortUrl} shortCode={link.shortCode} />
              <span className="tnum w-12 shrink-0 text-right text-sm font-medium text-foreground">
                {formatCount(link.clickCount)}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
