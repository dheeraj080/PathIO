import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  error?: string | null
  hint?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, ...props },
  ref,
) {
  const inputId = id ?? props.name
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={cn(
          'block h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm text-foreground transition-[border-color,box-shadow,background-color]',
          'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-input/30',
          error
            ? 'border-destructive focus-visible:ring-[3px] focus-visible:ring-destructive/25'
            : 'border-input focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
})
