import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Shared horizontal shell. Slightly tighter than the app shell for an editorial measure. */
export const LANDING_SHELL = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'

/**
 * Host the short links are served from — the same origin the app runs on.
 * Used by the illustrative diagrams that show what a short link looks like.
 */
export const SHORT_HOST = typeof window !== 'undefined' ? window.location.host : 'pathio.local'

/** Small mono kicker line used above section headings. */
export function Kicker({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn('font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground', className)}>
      {children}
    </p>
  )
}

/**
 * Editorial section heading: a numbered kicker, an oversized serif title, and an
 * optional one-line description. Sections are numbered like a table of contents.
 */
export function SectionHeading({
  index,
  kicker,
  title,
  description,
  className,
}: {
  index: string
  kicker: string
  title: ReactNode
  description?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('max-w-2xl', className)}>
      <Kicker>
        <span className="text-foreground">({index})</span>
        <span className="mx-2 text-muted-foreground/50">—</span>
        {kicker}
      </Kicker>
      <h2 className="mt-4 font-display text-[1.9rem] font-medium leading-[1.05] tracking-[-0.015em] text-foreground sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  )
}