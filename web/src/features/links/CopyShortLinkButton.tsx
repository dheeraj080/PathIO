import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { copyToClipboard } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'

/**
 * Copy affordance for a short link. Shows an explicit "Copied" label (also
 * announced to screen readers) rather than relying on the icon colour alone.
 */
export function CopyShortLinkButton({
  shortUrl,
  shortCode,
  className,
}: {
  shortUrl: string
  shortCode: string
  className?: string
}) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(shortUrl)
    if (!ok) {
      toast.push('Could not copy to clipboard', 'error')
      return
    }
    setCopied(true)
    toast.push('Link copied', 'success')
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={`Copy /${shortCode}`}
      title="Copy short link"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors',
        copied ? 'text-success' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
