import type { ClickHistoryPoint } from '@/types/api'

const MS_PER_DAY = 86_400_000

function dayKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Densifies a sparse history response into the last `days` UTC days, filling
 * missing days with zero. A real backend may only return days that saw clicks;
 * the chart still needs a point for every day so a line can be drawn across the
 * whole period (and so a single-click range does not collapse to one pixel).
 */
export function buildDailySeries(points: ClickHistoryPoint[], days: number): ClickHistoryPoint[] {
  const counts = new Map<string, number>()
  for (const point of points) {
    const key = point.date.slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + point.clicks)
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const series: ClickHistoryPoint[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * MS_PER_DAY)
    const key = dayKey(date)
    series.push({ date: key, clicks: counts.get(key) ?? 0 })
  }
  return series
}

export function sumClicks(points: { clicks: number }[]): number {
  return points.reduce((total, point) => total + point.clicks, 0)
}

/**
 * Builds a y-axis whose top always sits strictly above the data and whose ticks
 * land on clean values. A chart that tops out at the data max reads as clipped;
 * a chart with a top of `max + step` never does.
 */
export function axisScale(max: number): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 1, ticks: [0, 1] }

  const divisions = 5
  const rawStep = max / divisions
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  const step = niceNormalized * magnitude
  const niceMax = Math.max(step, Math.ceil(max / step) * step)

  const ticks: number[] = []
  for (let value = 0; value <= niceMax + step / 1000; value += step) {
    ticks.push(Math.round(value * 1000) / 1000)
  }
  return { max: niceMax, ticks }
}
