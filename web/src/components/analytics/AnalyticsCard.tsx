import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface AnalyticsTab {
  label: string
  value: string
}

interface AnalyticsCardProps {
  title?: string
  tabs?: AnalyticsTab[]
  activeTab?: string
  onTabChange?: (value: string) => void
  children: ReactNode
  className?: string
}

/** Card with an underlined title or tab row, mirroring the reference analytics card. */
export function AnalyticsCard({
  title,
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: AnalyticsCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border-[0.5px] border-border bg-card p-4 sm:p-6',
        className,
      )}
    >
      {title || tabs ? (
        <div className="mb-6 flex items-center justify-between gap-4 border-b-[0.5px] border-border pb-2">
          {title && !tabs ? (
            <span className="-mb-2.5 border-b-2 border-foreground pb-2 text-sm font-bold text-foreground">
              {title}
            </span>
          ) : null}
          {tabs ? (
            <div className="flex items-center gap-4 sm:gap-6">
              {tabs.map((tab) => {
                const isActive = tab.value === activeTab
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => onTabChange?.(tab.value)}
                    className={cn(
                      '-mb-2.5 border-b-2 pb-2 text-sm transition-colors',
                      isActive
                        ? 'border-foreground font-bold text-foreground'
                        : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}
