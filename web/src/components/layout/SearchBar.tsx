import { useEffect, useRef } from 'react'
import { Search, XCircle } from 'lucide-react'
import { Kbd } from '@/components/ui/Kbd'
import { cn } from '@/lib/cn'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Rounded search field with a clear affordance and a ⌘K / Ctrl-K focus shortcut. */
export function SearchBar({ value, onChange, placeholder = 'Search…', className }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasValue = value.length > 0

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className={cn('group relative w-full', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
        <Search className="size-4" />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (hasValue) onChange('')
            else event.currentTarget.blur()
          }
        }}
        placeholder={placeholder}
        maxLength={2048}
        className="h-10 w-full truncate rounded-xl border-[0.5px] border-border bg-background py-2 pl-9 pr-10 text-sm text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring sm:pr-14"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        {hasValue ? (
          <button
            type="button"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          >
            <XCircle className="size-4" />
          </button>
        ) : (
          <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
        )}
      </div>
    </div>
  )
}
