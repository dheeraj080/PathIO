import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { copyToClipboard } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'

export interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  value: string
  label?: string
  successMessage?: string
  /** Accessible label when not copied; defaults to "Copy {value}" */
  ariaLabelDefault?: string
}

export function CopyButton({
  value,
  label = 'Copy',
  successMessage = 'Copied to clipboard',
  ariaLabelDefault,
  className,
  variant = 'secondary',
  size = 'sm',
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  const baseAriaLabel = ariaLabelDefault ?? `Copy ${value}`

  const handleCopy = async () => {
    const ok = await copyToClipboard(value)
    if (ok) {
      setCopied(true)
      toast.push(successMessage, 'success')
      window.setTimeout(() => setCopied(false), 1500)
    } else {
      toast.push('Could not copy to clipboard', 'error')
    }
  }

  // When no label is provided (empty string), rely on aria-label for accessibility
  // and show only the icon. Otherwise show the label text.
  const visibleLabel = label ? label : undefined

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleCopy}
      aria-label={copied ? 'Link copied' : baseAriaLabel}
      {...props}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <>
          {visibleLabel ? (
            <span>{visibleLabel}</span>
          ) : null}
          <Copy className="h-4 w-4" />
        </>
      )}
      {copied ? 'Copied' : visibleLabel ?? label}
    </Button>
  )
}
