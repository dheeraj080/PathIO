import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, KeyRound, LogOut, UserRound } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useAuth } from '@/auth/useAuth'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

interface SidebarUserMenuProps {
  onNavigate?: () => void
  collapsed?: boolean
}

export function SidebarUserMenu({ onNavigate, collapsed = false }: SidebarUserMenuProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [signingOut, setSigningOut] = useState(false)

  if (!user) return null

  const go = (to: string) => {
    onNavigate?.()
    navigate(to)
  }

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
      toast.push('Signed out', 'info')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        title={collapsed ? (user.name ?? user.email) : undefined}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-sidebar-accent/50',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/40',
          collapsed ? 'justify-center px-0 py-2' : 'px-2 py-2',
        )}
      >
        <Avatar name={user.name} image={user.image} size={32} />
        {collapsed ? null : (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {user.name ?? 'Account'}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="min-w-[13rem]">
        <DropdownMenuItem onSelect={() => go('/profile')}>
          <UserRound className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go('/api-keys')}>
          <KeyRound className="size-4" />
          API keys
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void handleLogout()}
          disabled={signingOut}
          className="text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}