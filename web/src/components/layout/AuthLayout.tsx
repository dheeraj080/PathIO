import { Outlet } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { ThemeToggle } from '@/components/ThemeToggle'

/**
 * Centered auth chrome on the cream canvas, matching the reference login page:
 * a slim top bar with the brand + theme toggle and a single card below.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-sidebar text-foreground">
      <header className="flex items-center justify-between px-4 py-5 sm:px-6">
        <Brand to="/" />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
