import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ClickHistoryPoint } from '@/types/api'

export function HistoryChart({ data }: { data: ClickHistoryPoint[] }) {
  const formatted = data.map((point) => ({
    clicks: point.clicks,
    label: new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={24} stroke="rgb(var(--muted-foreground))" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} stroke="rgb(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid rgb(var(--border))',
              backgroundColor: 'rgb(var(--card))',
              color: 'rgb(var(--card-foreground))',
              fontSize: 12,
            }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="clicks"
            stroke="rgb(var(--chart-clicks))"
            strokeWidth={2}
            dot={false}
            name="Clicks"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
