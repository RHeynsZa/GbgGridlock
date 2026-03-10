import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchWorstLines } from '@/lib/api'

const fallbackData = [
  { line_number: '16', avg_delay_seconds: 302, sample_size: 128 },
  { line_number: 'X4', avg_delay_seconds: 287, sample_size: 96 },
  { line_number: '6', avg_delay_seconds: 241, sample_size: 188 },
  { line_number: '5', avg_delay_seconds: 228, sample_size: 164 },
]

export function DashboardPage() {
  const worstLinesQuery = useQuery({
    queryKey: ['worst-lines'],
    queryFn: fetchWorstLines,
  })

  const worstLines = Array.isArray(worstLinesQuery.data) && worstLinesQuery.data.length > 0 ? worstLinesQuery.data : fallbackData

  const networkDelay = useMemo(
    () => Math.round(worstLines.reduce((acc, row) => acc + row.avg_delay_seconds, 0) / worstLines.length),
    [worstLines],
  )

  return (
    <main className="container mx-auto grid max-w-4xl gap-4 p-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">GbgGridlock</h1>
        <p className="text-muted-foreground">Realtime transit pain-point dashboard for Västtrafik chokepoints</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>System Health Indicator</CardTitle>
          <CardDescription>Based on active query cache data from TanStack Query.</CardDescription>
        </CardHeader>
        <CardContent>
          <strong className="text-2xl">{networkDelay}s avg network delay</strong>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wall of Shame</CardTitle>
          <CardDescription>
            {worstLinesQuery.isError
              ? 'Could not load live API data. Showing fallback seed preview.'
              : 'Live data via axios + TanStack Query.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={worstLines}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="line_number" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg_delay_seconds" fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
