import { useEffect } from 'react'

/**
 * Sets the document `<title>` and, optionally, the `meta[name="description"]`
 * for the current route. Both values are restored on unmount so client-side
 * navigation keeps every page's metadata correct without a server round-trip.
 */
export function useDocumentMetadata({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title

    const meta = description
      ? document.querySelector<HTMLMetaElement>('meta[name="description"]')
      : null
    const previousDescription = meta?.getAttribute('content') ?? null
    if (meta && description) meta.setAttribute('content', description)

    return () => {
      document.title = previousTitle
      if (meta && previousDescription !== null) meta.setAttribute('content', previousDescription)
    }
  }, [title, description])
}
