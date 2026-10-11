import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Copy, ExternalLink, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { copyToClipboard } from '@/lib/format'
import type { UserUrlResponse } from '@/types/api'

interface LinkActionsMenuProps {
  url: UserUrlResponse
  onEdit?: (url: UserUrlResponse) => void
  onDelete?: (url: UserUrlResponse) => void
}

/** Actions for one short link, shared by the desktop table and mobile cards. */
export function LinkActionsMenu({ url, onEdit, onDelete }: LinkActionsMenuProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(url.shortUrl)
    if (!ok) {
      toast.push('Could not copy to clipboard', 'error')
      return
    }
    setCopied(true)
    toast.push('Link copied', 'success')
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <DropdownMenu className="shrink-0">
      <DropdownMenuTrigger
        aria-label={`Actions for /${url.shortCode}`}
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <MoreVertical className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => navigate(`/links/${url.shortCode}`)}>
          <BarChart3 className="size-4" />
          View analytics
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleCopy()}>
          <Copy className="size-4" />
          {copied ? 'Copied' : 'Copy link'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => window.open(url.shortUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="size-4" />
          Open original
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onEdit?.(url)}>
          <Pencil className="size-4" />
          Edit destination
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => onDelete?.(url)}
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}