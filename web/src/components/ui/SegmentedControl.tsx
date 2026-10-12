import { cn } from '@/lib/cn'

export interface SegmentedOption {
  value: string
  label: string
}

/**
 * Segmented text control. The active segment is marked with an ink underline
 * (`border-foreground`) plus ink text, so state is never carried by colour
 * alone. Keyboard operable via the native buttons.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('inline-flex items-center gap-1', className)}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'border-b-2 px-2.5 py-1.5 font-mono text-xs uppercase tracking-[0.08em] transition-colors',
              'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
