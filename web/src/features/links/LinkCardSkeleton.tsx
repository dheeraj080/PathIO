/** Pulsing placeholder row matching the {@link LinkCard} layout. */
export function LinkCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-xl border-[0.5px] border-border bg-card p-4 md:p-5">
      <div className="size-9 shrink-0 rounded-full border-[0.5px] border-border bg-muted" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted/60" />
        </div>
      </div>
      <div className="hidden h-5 w-16 rounded bg-muted sm:block" />
    </div>
  )
}

export function LinkCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <LinkCardSkeleton key={index} />
      ))}
    </div>
  )
}
