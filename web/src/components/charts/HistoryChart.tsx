import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ClickHistoryPoint } from '@/types/api'
import { axisScale } from '@/features/analytics/series'
import { useMediaQuery, usePrefersReducedMotion } from '@/lib/media'

interface ChartPoint {
  clicks: number
  label: string
  date: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-soft">
      <p className="font-mono uppercase tracking-[0.12em] text-muted-foreground">{point.label}</p>
      <p className="mt-1 text-popover-foreground">
        <span className="tnum font-display text-lg font-medium">{point.clicks}</span>{' '}
        <span className="text-muted-foreground">clicks</span>
      </p>
    </div>
  )
}

/**
 * Click trend. Deliberately understated: a single accent stroke over a soft wash
 * with light horizontal gridlines. The y-axis scale is derived from the data so
 * it always exceeds the maximum, dots appear when a single day carries the data,
 * and the whole series is mirrored in a screen-reader-only table.
 */
export function HistoryChart({
  data,
  ariaLabel = 'Clicks per day',
}: {
  data: ClickHistoryPoint[]
  ariaLabel?: string
}) {
  const reduced = usePrefersReducedMotion()
  const narrow = useMediaQuery('(max-width: 640px)')

  const points: ChartPoint[] = data.map((point) => ({
    clicks: point.clicks,
    label: new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    date: point.date,
  }))

  const max = data.reduce((peak, point) => Math.max(peak, point.clicks), 0)
  const scale = axisScale(max)
  const nonZeroDays = data.filter((point) => point.clicks > 0).length
  const showDots = nonZeroDays === 1

  return (
    <div className="w-full">
      <div className="h-56 w-full sm:h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: narrow ? -18 : -8 }}>
            <defs>
              <linearGradient id="history-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--chart-clicks))" stopOpacity={0.18} />
                <stop offset="100%" stopColor="rgb(var(--chart-clicks))" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={narrow ? false : { fontSize: 11, fill: 'rgb(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, scale.max]}
              ticks={scale.ticks}
              allowDecimals={false}
              tick={narrow ? false : { fontSize: 11, fill: 'rgb(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={narrow ? 4 : 36}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: 'rgb(var(--border))', strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="none"
              fill="url(#history-fill)"
              isAnimationActive={!reduced}
              animationDuration={600}
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="rgb(var(--chart-clicks))"
              strokeWidth={2}
              dot={
                showDots
                  ? { r: 3, fill: 'rgb(var(--chart-clicks))', strokeWidth: 0 }
                  : false
              }
              activeDot={{
                r: 4,
                fill: 'rgb(var(--chart-clicks))',
                stroke: 'rgb(var(--background))',
                strokeWidth: 2,
              }}
              isAnimationActive={!reduced}
              animationDuration={600}
              name="Clicks"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.date}</th>
              <td>{point.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
