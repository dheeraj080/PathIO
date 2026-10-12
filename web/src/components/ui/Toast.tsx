import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  push: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId++
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  const value = useMemo<ToastContextValue>(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-soft animate-fade-in',
              toast.tone === 'success' &&
                'border-green-700/20 bg-green-100 text-green-700 dark:border-green-300/20 dark:bg-green-950 dark:text-green-300',
              toast.tone === 'error' &&
                'border-red-700/20 bg-red-100 text-red-700 dark:border-red-300/20 dark:bg-red-950 dark:text-red-300',
              toast.tone === 'info' && 'border-border bg-card text-card-foreground',
            )}
          >
            {toast.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : null}
            {toast.tone === 'error' ? <XCircle className="mt-0.5 h-4 w-4" /> : null}
            {toast.tone === 'info' ? <Info className="mt-0.5 h-4 w-4" /> : null}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="text-xs opacity-60 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a <ToastProvider>')
  return context
}
