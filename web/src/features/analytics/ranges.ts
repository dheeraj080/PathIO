export const RANGES = [7, 30, 90] as const
export type Range = (typeof RANGES)[number]

export const RANGE_OPTIONS = RANGES.map((value) => ({ value: String(value), label: `${value}d` }))

export const DEFAULT_RANGE: Range = 30
