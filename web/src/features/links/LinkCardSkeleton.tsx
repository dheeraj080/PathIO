/** Pulsing placeholder row matching the {@link LinkCard} layout. */
export function LinkCardSkeleton() {
  return (
    <div className="flex items-start gap-3 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded-sm bg-muted" />
        <div className="h-3 w-40 animate-pulse rounded-sm bg-muted/70" />
      </div>
      <div className="size-9 shrink-0 animate-pulse rounded-sm bg-muted" />
    </div>
  )
}

export function LinkCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, index) => (
        <LinkCardSkeleton key={index} />
      ))}
    </div>
  )
}
