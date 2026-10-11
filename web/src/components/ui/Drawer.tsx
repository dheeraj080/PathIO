import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  title?: ReactNode
  children: ReactNode
  className?: string
}

/** Slide-in panel used for the mobile navigation and action sheets. */
export function Drawer({ open, onClose, side = 'left', title, children, className }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'absolute inset-y-0 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-soft',
          side === 'left' ? 'left-0 border-r border-sidebar-border' : 'right-0 border-l border-sidebar-border',
          className,
        )}
      >
        {title ? (
          <div className="flex items-center justify-between gap-4 border-b border-sidebar-border px-4 py-3">
            <span className="text-sm font-semibold">{title}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
