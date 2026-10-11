import { ChevronsUpDown, Link2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Spinner } from '@/components/ui/Spinner'
import { displayUrl } from '@/lib/format'
import { useAnalyticsLinks } from '@/features/analytics/useAnalyticsLinks'

interface AnalyticsLinkPickerProps {
  shortCode: string
  onSelect: (shortCode: string) => void
}

/** Compact dropdown to choose which link's analytics are shown on the analytics page. */
export function AnalyticsLinkPicker({ shortCode, onSelect }: AnalyticsLinkPickerProps) {
  const { data, isLoading, isError } = useAnalyticsLinks()
  const links = data?.content ?? []
  const selected = links.find((link) => link.shortCode === shortCode)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
      aria-label="Select link"
      className="flex h-10 min-w-0 max-w-full items-center gap-2 rounded-xl border-[0.5px] border-border bg-card px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
        {isLoading ? (
          <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
            <Spinner className="size-4" />
            Loading links…
          </span>
        ) : selected ? (
          <>
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="shrink-0 font-mono text-foreground">/{selected.shortCode}</span>
            <span
              className="hidden min-w-0 flex-1 truncate text-muted-foreground sm:block"
              title={selected.longUrl}
            >
              {displayUrl(selected.longUrl, 48)}
            </span>
          </>
        ) : (
          <span className="whitespace-nowrap text-muted-foreground">Select a link</span>
        )}
        <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        {isError ? (
          <DropdownMenuItem disabled>Could not load your links</DropdownMenuItem>
        ) : links.length === 0 ? (
          <DropdownMenuItem disabled>No links yet</DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuLabel>Your links</DropdownMenuLabel>
            {links.map((link) => (
              <DropdownMenuItem key={link.shortCode} onSelect={() => onSelect(link.shortCode)}>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm">/{link.shortCode}</span>
                  <span
                    className="block truncate text-xs text-muted-foreground"
                    title={link.longUrl}
                  >
                    {displayUrl(link.longUrl, 64)}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}