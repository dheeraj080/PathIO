import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { copyToClipboard } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'

/** Compact copy-to-clipboard affordance for a short link, with a brief check state. */
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
        'flex size-5 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:text-foreground',
        copied && 'text-success hover:text-success',
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}