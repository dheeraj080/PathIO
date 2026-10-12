import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/cn'

interface DropdownContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  close: () => void
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

function useDropdown(): DropdownContextValue {
  const context = useContext(DropdownContext)
  if (!context) throw new Error('DropdownMenu components must be used within <DropdownMenu>')
  return context
}

/**
 * Lightweight dropdown menu. Closes on outside click, Escape, and item
 * selection, mirroring the reference's Radix-based menu behaviour without the
 * extra dependency.
 */
export function DropdownMenu({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <DropdownContext.Provider value={{ open, setOpen, close: () => setOpen(false) }}>
      <div ref={ref} className={cn('relative', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export function DropdownMenuTrigger({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useDropdown()
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  align = 'end',
  side = 'bottom',
  className,
  children,
}: {
  align?: 'start' | 'end'
  side?: 'top' | 'bottom'
  className?: string
  children: ReactNode
}) {
  const { open } = useDropdown()
  if (!open) return null
  return (
    <div
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        'absolute z-40 min-w-[11rem] animate-fade-in overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-soft',
        align === 'end' ? 'right-0' : 'left-0',
        side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({
  className,
  onSelect,
  disabled,
  children,
}: {
  className?: string
  onSelect?: () => void
  disabled?: boolean
  children: ReactNode
}) {
  const { close } = useDropdown()
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        onSelect?.()
        close()
      }}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors',
        'hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-border', className)} />
}

export function DropdownMenuLabel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}>
      {children}
    </div>
  )
}
