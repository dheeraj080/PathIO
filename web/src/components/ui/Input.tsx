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
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={cn(
          'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2',
          'dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500/60 dark:focus:ring-red-900'
            : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200 dark:border-slate-600 dark:focus:ring-brand-900',
          'disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-900',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
})
