import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/**
 * Editorial wordmark: Fraunces "Path" + ember "/IO". Matches the landing page
 * mark so the authenticated app and the marketing page read as one product.
 */
export function Brand({
  to = '/',
  className,
  showWordmark = true,
}: {
  to?: string
  className?: string
  showWordmark?: boolean
}) {
  return (
    <Link
      to={to}
      aria-label="PathIO"
      className={cn('inline-flex items-baseline gap-2 text-foreground', className)}
    >
      <span className="font-display text-xl font-medium leading-none tracking-[-0.02em]">
        {showWordmark ? (
          <>
            Path<span className="text-primary">/IO</span>
          </>
        ) : (
          <>
            P<span className="text-primary">/</span>
          </>
        )}
      </span>
    </Link>
  )
}
