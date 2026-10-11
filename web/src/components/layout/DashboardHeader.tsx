import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PageHeading } from '@/components/layout/PageHeading'
import { SearchBar } from '@/components/layout/SearchBar'
import { requestCreateLink } from '@/lib/events'

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analytics': 'Analytics',
  '/api-keys': 'API keys',
  '/profile': 'Profile',
  '/admin/users': 'Administration',
  '/admin/links': 'All links',
}

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/links/')) return 'Analytics'
  if (pathname.startsWith('/admin/')) return 'Administration'
  return ''
}

export function DashboardHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const isInputTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)

  const handleSearchChange = (value: string) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set('q', value)
        else next.delete('q')
        return next
      },
      { replace: true },
    )
  }

  const handleCreate = () => {
    if (pathname !== '/dashboard') navigate('/dashboard')
    // Let the dashboard mount its shortener before asking it to focus.
    window.setTimeout(requestCreateLink, 0)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCreateShortcut =
        event.key.toLowerCase() === 'c' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isInputTarget(event.target)
      if (isCreateShortcut) {
        event.preventDefault()
        handleCreate()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <header className="flex h-16 w-full items-center gap-3 sm:gap-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <PanelLeft className="size-5" />
      </Button>

      <PageHeading>{titleFor(pathname)}</PageHeading>

      {pathname === '/dashboard' ? (
        <div className="min-w-0 flex-1 md:max-w-sm">
          <SearchBar value={search} onChange={handleSearchChange} placeholder="Search your links…" />
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
        <ThemeToggle />
      </div>
    </header>
  )
}
