import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-600',
        className,
      )}
    >
      {icon ? <div className="text-slate-400 dark:text-slate-500">{icon}</div> : null}
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
