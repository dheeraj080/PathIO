import { hostOf } from '@/lib/format'

/** Human labels for the device dimension, including the automated-traffic bucket. */
const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
  bot: 'Bots / crawlers',
}

/** Device values that represent automated traffic, rendered distinctly. */
export const CRAWLER_VALUES = ['bot']

export function deviceLabel(value: string): string {
  return DEVICE_LABELS[value.toLowerCase()] ?? (value || 'Unknown')
}

/** Collapses a referrer URL to its domain; empty referrers are "direct". */
export function referrerLabel(value: string): string {
  if (!value) return 'Direct / unknown'
  return hostOf(value)
}
