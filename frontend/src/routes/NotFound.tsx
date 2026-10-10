import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <Compass className="h-10 w-10 text-slate-400" />
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The page you are looking for does not exist.
        </p>
      </div>
      <Link to="/">
        <Button>Back home</Button>
      </Link>
    </div>
  )
}
