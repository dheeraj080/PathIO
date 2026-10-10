export type ClassValue = string | number | null | false | undefined | ClassValue[]

/** Tiny classNames joiner (avoids pulling in clsx/tailwind-merge). */
export function cn(...values: ClassValue[]): string {
  const out: string[] = []
  const walk = (value: ClassValue): void => {
    if (value === null || value === undefined || value === false || value === '') return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    out.push(String(value))
  }
  values.forEach(walk)
  return out.join(' ')
}
