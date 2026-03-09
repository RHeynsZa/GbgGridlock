import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const mockWorstLines = [
  { line_number: '16', avg_delay_seconds: 302, sample_size: 128 },
  { line_number: 'X4', avg_delay_seconds: 287, sample_size: 96 },
  { line_number: '6', avg_delay_seconds: 241, sample_size: 188 },
  { line_number: '5', avg_delay_seconds: 228, sample_size: 164 },
]

export function App() {
  const networkDelay = useMemo(
    () => Math.round(mockWorstLines.reduce((acc, row) => acc + row.avg_delay_seconds, 0) / mockWorstLines.length),
    [],
  )

  return (
    <main className="container">
      <header>
        <h1>GbgGridlock</h1>
        <p>Realtime transit pain-point dashboard for Västtrafik chokepoints</p>
      </header>

      <section className="card">
        <h2>System Health Indicator</h2>
        <strong>{networkDelay}s avg network delay</strong>
      </section>

      <section className="card">
        <h2>Wall of Shame (seed preview)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={mockWorstLines}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="line_number" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="avg_delay_seconds" fill="#d9534f" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </main>
  )
}
