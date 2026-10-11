import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Pagination({
  page,
  totalPages,
  totalElements,
  onChange,
  disabled = false,
}: {
  page: number
  totalPages: number
  totalElements: number
  onChange: (page: number) => void
  disabled?: boolean
}) {
  const safeTotal = Math.max(totalPages, 1)
  const canPrev = page > 0 && !disabled
  const canNext = page < safeTotal - 1 && !disabled

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2 text-sm text-slate-600 dark:text-slate-300">
      <span>
        Page {page + 1} of {safeTotal}
        <span className="ml-2 text-slate-400 dark:text-slate-500">({totalElements} total)</span>
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={!canPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={!canNext}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
