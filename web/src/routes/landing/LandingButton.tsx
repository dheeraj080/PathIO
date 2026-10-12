import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
const VARIANTS = {
  /** Ink (or warm paper in dark mode) — the one loud, flat editorial button. */
  primary: 'bg-foreground text-background shadow-card hover:bg-primary hover:text-primary-foreground',
  /** Hairline box — quiet secondary action. */
  outline: 'border border-border bg-transparent text-foreground hover:border-foreground/40 hover:bg-accent',
  /** Text-only. */
  ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
} as const

const SIZES = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-sm',
} as const

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium tracking-[-0.01em] ' +
  'transition-[color,background-color,border-color,transform] duration-200 ease-out active:translate-y-px ' +
  'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0'

export interface LandingButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  /** Render a router link instead of a button. */
  to?: string
  /** Render a plain anchor instead of a button. */
  href?: string
  onClick?: () => void
  children: ReactNode
}

/**
 * Landing-page button that renders a router link, a plain anchor, or a button —
 * always with the editorial flat styling (no glow, no icon-in-a-square).
 */
export function LandingButton({
  variant = 'primary',
  size = 'md',
  to,
  href,
  onClick,
  className,
  children,
  ...props
}: LandingButtonProps) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className)
  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={classes} onClick={onClick} {...props}>
      {children}
    </button>
  )
}