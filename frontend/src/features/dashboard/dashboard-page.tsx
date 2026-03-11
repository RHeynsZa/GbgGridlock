import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BusFront, Ship, TramFront } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type CorridorMetric = {
  corridor: string
  avgDelaySeconds: number
  canceledDepartures: number
  ridership: number
  reliability: number
}

type ModalShare = {
  mode: string
  value: number
}

type TrendPoint = {
  hour: string
  tram: number
  bus: number
  ferry: number
}

type LineDrilldown = {
  line: string
  mode: 'Tram' | 'Bus' | 'Ferry'
  district: string
  avgDelaySeconds: number
  crowdingScore: number
  canceledTrips: number
  onTimeRate: number
}

const corridorMetrics: CorridorMetric[] = [
  { corridor: 'Brunnsparken', avgDelaySeconds: 286, canceledDepartures: 18, ridership: 12400, reliability: 72 },
  { corridor: 'Linnéplatsen', avgDelaySeconds: 224, canceledDepartures: 11, ridership: 9700, reliability: 79 },
  { corridor: 'Korsvägen', avgDelaySeconds: 248, canceledDepartures: 15, ridership: 10600, reliability: 76 },
  { corridor: 'Järntorget', avgDelaySeconds: 198, canceledDepartures: 9, ridership: 8200, reliability: 82 },
]

const modalSplit: ModalShare[] = [
  { mode: 'Tram', value: 48 },
  { mode: 'Bus', value: 39 },
  { mode: 'Ferry', value: 13 },
]

const delayTrend: TrendPoint[] = [
  { hour: '06:00', tram: 110, bus: 140, ferry: 88 },
  { hour: '08:00', tram: 275, bus: 290, ferry: 133 },
  { hour: '10:00', tram: 188, bus: 205, ferry: 95 },
  { hour: '12:00', tram: 164, bus: 178, ferry: 90 },
  { hour: '14:00', tram: 201, bus: 224, ferry: 108 },
  { hour: '16:00', tram: 304, bus: 337, ferry: 156 },
  { hour: '18:00', tram: 281, bus: 302, ferry: 147 },
  { hour: '20:00', tram: 172, bus: 196, ferry: 101 },
]

const lineDrilldown: LineDrilldown[] = [
  { line: '5', mode: 'Tram', district: 'Centrum', avgDelaySeconds: 244, crowdingScore: 87, canceledTrips: 3, onTimeRate: 67 },
  { line: '6', mode: 'Tram', district: 'Hisingen', avgDelaySeconds: 268, crowdingScore: 81, canceledTrips: 4, onTimeRate: 64 },
  { line: '11', mode: 'Tram', district: 'Majorna', avgDelaySeconds: 198, crowdingScore: 74, canceledTrips: 1, onTimeRate: 76 },
  { line: '16', mode: 'Bus', district: 'Centrum', avgDelaySeconds: 302, crowdingScore: 90, canceledTrips: 5, onTimeRate: 59 },
  { line: '19', mode: 'Bus', district: 'Hisingen', avgDelaySeconds: 236, crowdingScore: 78, canceledTrips: 2, onTimeRate: 70 },
  { line: 'X4', mode: 'Bus', district: 'Lundby', avgDelaySeconds: 287, crowdingScore: 86, canceledTrips: 6, onTimeRate: 61 },
  { line: '286', mode: 'Ferry', district: 'Södra Skärgården', avgDelaySeconds: 155, crowdingScore: 58, canceledTrips: 1, onTimeRate: 83 },
  { line: '287', mode: 'Ferry', district: 'Norra Skärgården', avgDelaySeconds: 171, crowdingScore: 61, canceledTrips: 2, onTimeRate: 80 },
]

const pieColors = ['#5B8FF9', '#5AD8A6', '#5D7092']

export function DashboardPage() {
  const [selectedMode, setSelectedMode] = useState<'All' | LineDrilldown['mode']>('All')
  const [selectedLine, setSelectedLine] = useState<string | null>(null)

  const avgDelay = useMemo(
    () => Math.round(corridorMetrics.reduce((sum, corridor) => sum + corridor.avgDelaySeconds, 0) / corridorMetrics.length),
    [],
  )

  const reliability = useMemo(
    () => Math.round(corridorMetrics.reduce((sum, corridor) => sum + corridor.reliability, 0) / corridorMetrics.length),
    [],
  )

  const filteredLines = useMemo(
    () => lineDrilldown.filter((line) => (selectedMode === 'All' ? true : line.mode === selectedMode)),
    [selectedMode],
  )

  const selectedLineStats = useMemo(
    () => filteredLines.find((line) => line.line === selectedLine) ?? filteredLines[0] ?? null,
    [filteredLines, selectedLine],
  )

  const lineDelayRanking = useMemo(
    () => [...lineDrilldown].sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds),
    [],
  )

  const maxLineDelay = lineDelayRanking[0]?.avgDelaySeconds ?? 1

  const getModeIcon = (mode: LineDrilldown['mode']) => {
    if (mode === 'Bus') {
      return <BusFront className="h-4 w-4" />
    }

    if (mode === 'Ferry') {
      return <Ship className="h-4 w-4" />
    }

    return <TramFront className="h-4 w-4" />
  }

  return (
    <main className="container mx-auto grid max-w-6xl gap-5 p-6">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Västtrafik Pulse Dashboard</h1>
        <p className="text-muted-foreground">Interactive operations cockpit for delay, reliability, and drilldown analysis.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Network delay</CardDescription>
            <CardTitle className="text-3xl">{avgDelay}s</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Average corridor delay across major chokepoints.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reliability score</CardDescription>
            <CardTitle className="text-3xl">{reliability}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Composite on-time performance for active routes.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily passengers impacted</CardDescription>
            <CardTitle className="text-3xl">
              {corridorMetrics.reduce((sum, corridor) => sum + corridor.ridership, 0).toLocaleString('sv-SE')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Estimated riders exposed to delay spikes today.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Line delay ranking</CardTitle>
            <CardDescription>Horizontal delay bars per line, with transport icons at each bar endpoint.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {lineDelayRanking.map((line) => {
                const widthPercent = Math.max(8, Math.round((line.avgDelaySeconds / maxLineDelay) * 100))

                return (
                  <div key={line.line} className="grid grid-cols-[70px_1fr_50px] items-center gap-2">
                    <p className="text-sm font-medium">
                      {line.mode} {line.line}
                    </p>
                    <div className="relative h-9 rounded-md bg-muted/60">
                      <div
                        className="flex h-full items-center justify-end rounded-md bg-[var(--chart-1)] pr-2 text-white"
                        style={{ width: `${widthPercent}%` }}
                      >
                        <span className="rounded-full bg-black/20 p-1">{getModeIcon(line.mode)}</span>
                      </div>
                    </div>
                    <p className="text-right text-sm font-medium">{line.avgDelaySeconds}s</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modal delay contribution</CardTitle>
            <CardDescription>Click a segment to drill into route-level performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modalSplit}
                    dataKey="value"
                    nameKey="mode"
                    outerRadius={95}
                    label
                    onClick={(entry) => setSelectedMode(entry.mode as LineDrilldown['mode'])}
                  >
                    {modalSplit.map((entry, index) => (
                      <Cell key={entry.mode} fill={pieColors[index % pieColors.length]} className="cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-md border px-2 py-1 text-sm"
                onClick={() => {
                  setSelectedMode('All')
                  setSelectedLine(null)
                }}
              >
                Reset filter
              </button>
              <span className="text-sm text-muted-foreground">Active filter: {selectedMode}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Delay timeline</CardTitle>
            <CardDescription>Rush-hour volatility by transport mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={delayTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="tram" stackId="1" stroke="#5B8FF9" fill="#5B8FF9" fillOpacity={0.45} />
                  <Area type="monotone" dataKey="bus" stackId="1" stroke="#5AD8A6" fill="#5AD8A6" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="ferry" stackId="1" stroke="#5D7092" fill="#5D7092" fillOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Route drilldown</CardTitle>
            <CardDescription>Select a line for details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {filteredLines.map((line) => (
                <button
                  key={line.line}
                  className="rounded-md border px-2 py-1 text-sm"
                  onClick={() => setSelectedLine(line.line)}
                >
                  {line.mode} {line.line}
                </button>
              ))}
            </div>

            {selectedLineStats ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">
                  {selectedLineStats.mode} {selectedLineStats.line} · {selectedLineStats.district}
                </p>
                <p>Average delay: {selectedLineStats.avgDelaySeconds}s</p>
                <p>On-time rate: {selectedLineStats.onTimeRate}%</p>
                <p>Crowding index: {selectedLineStats.crowdingScore}/100</p>
                <p>Canceled trips: {selectedLineStats.canceledTrips}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No lines available for this filter.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
