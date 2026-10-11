import { Link } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { cn } from '@/lib/cn'

/** PathIO logo mark + wordmark, linked to a destination (default: home). */
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
    <Link to={to} className={cn('flex items-center gap-2 text-foreground', className)}>
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Link2 className="size-5" />
      </span>
      {showWordmark ? (
        <span className="text-lg font-extrabold tracking-tight">PathIO</span>
      ) : null}
    </Link>
  )
}
