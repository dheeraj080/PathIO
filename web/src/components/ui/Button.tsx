import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  // The accent is reserved for the single primary action; no glow, flat fill.
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary:
    'border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
  ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
  danger:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30',
  link: 'bg-transparent text-foreground underline underline-offset-4 hover:text-primary',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-md px-3 text-xs',
  md: 'h-9 gap-2 rounded-md px-4 text-sm',
  lg: 'h-10 gap-2 rounded-md px-5 text-sm',
  icon: 'h-9 w-9 rounded-md',
  'icon-sm': 'h-8 w-8 rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium',
        'transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.985]',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  )
})
