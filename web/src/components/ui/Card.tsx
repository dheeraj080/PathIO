import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Flatter, hairline-bordered surface. Cards group interactive elements only. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card text-card-foreground transition-colors',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-border px-6 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="font-display text-lg font-medium tracking-[-0.01em] text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 border-t border-border px-6 py-4',
        className,
      )}
      {...props}
    />
  )
}
