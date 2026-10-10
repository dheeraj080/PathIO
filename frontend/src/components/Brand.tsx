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
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100',
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <Link2 className="h-5 w-5" />
      </span>
      {showWordmark ? <span className="text-lg tracking-tight">PathIO</span> : null}
    </Link>
  )
}
