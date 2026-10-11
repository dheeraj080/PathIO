export function Avatar({
  name,
  image,
  size = 32,
}: {
  name?: string | null
  image?: string | null
  size?: number
}) {
  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  if (image) {
    return (
      <img
        src={image}
        alt={name ?? 'User avatar'}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/60 dark:text-brand-200"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  )
}
