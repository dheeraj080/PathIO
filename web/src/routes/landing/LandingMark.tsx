import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/**
 * Editorial wordmark: Fraunces "Path" + ember "/IO". Kept inside the landing so
 * the dashboard's brand component is left untouched.
 */
export function LandingMark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="PathIO — home"
      className={cn('group inline-flex items-baseline gap-2.5', className)}
    >
      <span className="font-display text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-foreground">
        Path<span className="text-primary">/IO</span>
      </span>
      <span
        aria-hidden="true"
        className="hidden font-mono text-[10px] uppercase tracking-[0.26em] text-muted-foreground sm:inline"
      >
        short links
      </span>
    </Link>
  )
}