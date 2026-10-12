import { Link, useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-xl border border-border bg-muted">
        <Compass className="size-7 text-muted-foreground" />
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-7xl font-bold tracking-tight text-foreground">404</span>
        <p className="text-lg font-medium text-foreground">Page not found</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Link to="/">
          <Button>Back home</Button>
        </Link>
      </div>
    </section>
  )
}
