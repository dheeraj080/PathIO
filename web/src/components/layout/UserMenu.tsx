import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { LogOut, Shield, User as UserIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/Avatar'
import { useAuth } from '@/auth/useAuth'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

export function UserMenu() {
  const { user, isAdmin, logout } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  useEffect(() => {
    // Close on Escape key
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        // Re-focus the trigger button
        if (ref.current) {
          ref.current.focus()
        }
      }
    }
    ;(window as any).addEventListener('keydown', onKeyDown)
    return () => {
      ;(window as any).removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    toast.push('Signed out', 'info')
  }

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.name} image={user.image} />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:block">
          {user.name ?? user.email}
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            'absolute right-0 z-40 mt-2 w-56 animate-fade-in overflow-hidden rounded-xl border bg-white py-1 shadow-lg',
            'border-slate-200 dark:border-slate-700 dark:bg-slate-800',
          )}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <p className="truncate text-sm font-medium">{user.name ?? 'Account'}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            tabIndex={0}
          >
            <UserIcon className="h-4 w-4" />
            Profile
          </Link>
          {isAdmin ? (
            <Link
              to="/admin/users"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
              tabIndex={0}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            tabIndex={0}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
