import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, BusFront, Languages, Moon, Ship, Sun, TramFront, TriangleAlert, Waves } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchDebugMetrics, fetchLineColors, fetchMonitoredStops, fetchWorstLines } from '@/lib/api'

type LineMode = 'Tram' | 'Bus' | 'Ferry'

type CorridorMetric = {
  corridor: string
  avgDelaySeconds: number
  canceledDepartures: number
  ridership: number
  reliability: number
}

type TrendPoint = {
  hour: string
  tram: number
  bus: number
  ferry: number
}

type LineDrilldown = {
  line: string
  mode: LineMode
  district: string
  avgDelaySeconds: number
  crowdingScore: number
  canceledTrips: number
  onTimeRate: number
}

type DistributionPoint = {
  mode: LineMode
  p50: number
  p85: number
  p95: number
}

const corridorMetrics: CorridorMetric[] = [
  { corridor: 'Brunnsparken', avgDelaySeconds: 286, canceledDepartures: 18, ridership: 12400, reliability: 72 },
  { corridor: 'Linnéplatsen', avgDelaySeconds: 224, canceledDepartures: 11, ridership: 9700, reliability: 79 },
  { corridor: 'Korsvägen', avgDelaySeconds: 248, canceledDepartures: 15, ridership: 10600, reliability: 76 },
  { corridor: 'Järntorget', avgDelaySeconds: 198, canceledDepartures: 9, ridership: 8200, reliability: 82 },
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

const fallbackLineStyles: Record<string, { backgroundColor: string; textColor: string; borderColor: string }> = {
  '5': { backgroundColor: '#56B4E9', textColor: '#0F172A', borderColor: '#56B4E9' },
  '6': { backgroundColor: '#009E73', textColor: '#FFFFFF', borderColor: '#009E73' },
  '11': { backgroundColor: '#F0E442', textColor: '#111827', borderColor: '#F0E442' },
  '16': { backgroundColor: '#0072B2', textColor: '#FFFFFF', borderColor: '#0072B2' },
  '19': { backgroundColor: '#D55E00', textColor: '#FFFFFF', borderColor: '#D55E00' },
  X4: { backgroundColor: '#CC79A7', textColor: '#FFFFFF', borderColor: '#CC79A7' },
  '286': { backgroundColor: '#006D77', textColor: '#FFFFFF', borderColor: '#006D77' },
  '287': { backgroundColor: '#264653', textColor: '#FFFFFF', borderColor: '#264653' },
}

const chartModeOrder: LineMode[] = ['Tram', 'Bus', 'Ferry']

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const [selectedMode, setSelectedMode] = useState<'All' | LineMode>('All')
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [selectedStop, setSelectedStop] = useState<string>('all')
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => document.documentElement.classList.contains('dark'))

  const lineColorsQuery = useQuery({ queryKey: ['line-colors'], queryFn: fetchLineColors })
  const monitoredStopsQuery = useQuery({ queryKey: ['monitored-stops'], queryFn: fetchMonitoredStops })
  const worstLinesQuery = useQuery({
    queryKey: ['worst-lines-by-stop', selectedStop],
    queryFn: () => fetchWorstLines(selectedStop === 'all' ? undefined : selectedStop),
  })
  const debugMetricsQuery = useQuery({
    queryKey: ['debug-metrics'],
    queryFn: fetchDebugMetrics,
    refetchInterval: 30_000,
  })

  const avgDelay = useMemo(
    () => Math.round(corridorMetrics.reduce((sum, corridor) => sum + corridor.avgDelaySeconds, 0) / corridorMetrics.length),
    [],
  )
  const reliability = useMemo(
    () => Math.round(corridorMetrics.reduce((sum, corridor) => sum + corridor.reliability, 0) / corridorMetrics.length),
    [],
  )

  const cancellationRate = useMemo(() => {
    const cancel = corridorMetrics.reduce((sum, corridor) => sum + corridor.canceledDepartures, 0)
    const baselineDepartures = 640
    return Number(((cancel / baselineDepartures) * 100).toFixed(1))
  }, [])

  const p95Delay = useMemo(() => {
    const sorted = [...lineDrilldown].sort((a, b) => a.avgDelaySeconds - b.avgDelaySeconds)
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
    return sorted[idx]?.avgDelaySeconds ?? 0
  }, [])

  const filteredLines = useMemo(
    () => lineDrilldown.filter((line) => (selectedMode === 'All' ? true : line.mode === selectedMode)),
    [selectedMode],
  )

  const selectedLineStats = useMemo(
    () => filteredLines.find((line) => line.line === selectedLine) ?? filteredLines[0] ?? null,
    [filteredLines, selectedLine],
  )

  const normalizeLineNumber = (line: string) => line.trim().toUpperCase()

  const lineStyles = useMemo(() => {
    const entries = (lineColorsQuery.data ?? []).flatMap((row) => {
      const normalized = normalizeLineNumber(row.lineNumber)
      return [
        [row.lineNumber, row],
        [normalized, row],
      ] as const
    })

    return Object.fromEntries(entries)
  }, [lineColorsQuery.data])

  const lineDelayRanking = useMemo(() => {
    if (worstLinesQuery.data && worstLinesQuery.data.length > 0) {
      return [...worstLinesQuery.data]
        .map((line) => ({
          line: line.line_number,
          mode: (line.line_number.startsWith('2') ? 'Ferry' : 'Bus') as LineMode,
          avgDelaySeconds: Math.round(line.avg_delay_seconds),
        }))
        .sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds)
    }

    return [...lineDrilldown].sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds)
  }, [worstLinesQuery.data])

  const distributionByMode = useMemo<DistributionPoint[]>(() => {
    return chartModeOrder.map((mode) => {
      const values = lineDrilldown
        .filter((line) => line.mode === mode)
          .map((line) => line.avgDelaySeconds)
          .sort((a, b) => a - b)

      if (values.length === 0) {
        return { mode, p50: 0, p85: 0, p95: 0 }
      }

      const percentile = (p: number) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))]

      return {
        mode,
        p50: percentile(0.5),
        p85: percentile(0.85),
        p95: percentile(0.95),
      }
    })
  }, [])

  const maxLineDelay = lineDelayRanking[0]?.avgDelaySeconds ?? 1

  const getModeIcon = (mode: LineMode) => {
    if (mode === 'Bus') return <BusFront className="h-4 w-4" />
    if (mode === 'Ferry') return <Ship className="h-4 w-4" />
    return <TramFront className="h-4 w-4" />
  }

  const getLineStyle = (line: string) => {
    const normalized = normalizeLineNumber(line)
    return (
      lineStyles[line] ??
      lineStyles[normalized] ??
      fallbackLineStyles[normalized] ?? { backgroundColor: '#64748B', textColor: '#FFFFFF', borderColor: '#64748B' }
    )
  }

  const toggleTheme = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith('sv') ? 'en' : 'sv')
  }

  const formatKpi = (value: number, suffix: string) => `${new Intl.NumberFormat(i18n.language).format(value)}${suffix}`
  const translateMode = (mode: LineMode | 'All') => t(`dashboard.modes.${mode.toLowerCase()}`)

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 px-3 py-4 sm:px-6 lg:space-y-6 lg:px-10 lg:py-8">
      <header className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/85 p-5 shadow-[0_30px_80px_-35px_rgba(96,55,177,0.6)] backdrop-blur lg:p-8">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-6 h-44 w-44 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{t('dashboard.badge')}</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">GbgGridlock</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{t('dashboard.subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button className="toggle-btn justify-center" type="button" onClick={toggleLanguage}>
              <Languages className="h-4 w-4" /> {t('controls.language')}
            </button>
            <button className="toggle-btn justify-center" type="button" onClick={toggleTheme}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {t('controls.theme')}
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: t('kpis.networkDelay'), value: formatKpi(avgDelay, 's'), icon: <TriangleAlert className="h-4 w-4" />, note: t('kpis.networkDelayDesc') },
          { title: t('kpis.p95Delay'), value: formatKpi(p95Delay, 's'), icon: <Waves className="h-4 w-4" />, note: t('kpis.p95DelayDesc') },
          { title: t('kpis.reliability'), value: formatKpi(reliability, '%'), icon: <ArrowUpRight className="h-4 w-4" />, note: t('kpis.reliabilityDesc') },
          {
            title: t('kpis.cancellationRate'),
            value: formatKpi(cancellationRate, '%'),
            icon: <BusFront className="h-4 w-4" />,
            note: t('kpis.cancellationRateDesc'),
          },
        ].map((kpi) => (
          <Card key={kpi.title} className="kpi-card rounded-2xl">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide">
                {kpi.title}
                <span className="rounded-full bg-primary/10 p-2 text-primary">{kpi.icon}</span>
              </CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{kpi.note}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-8">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('filters.title')}</CardTitle>
            <CardDescription>{t('filters.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="stop-filter">
                {t('filters.stop')}
              </label>
              <select id="stop-filter" className="input-select" value={selectedStop} onChange={(event) => setSelectedStop(event.target.value)}>
                <option value="all">{t('filters.allStops')}</option>
                {(monitoredStopsQuery.data ?? []).map((stop) => (
                  <option key={stop.stop_gid} value={stop.stop_gid}>
                    {stop.stop_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {(['All', 'Tram', 'Bus'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`chip justify-center text-center ${selectedMode === mode ? 'chip-active' : ''}`}
                  onClick={() => {
                    setSelectedMode(mode)
                    setSelectedLine(null)
                  }}
                >
                  {translateMode(mode)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader>
            <CardTitle>{t('charts.timelineTitle')}</CardTitle>
            <CardDescription>{t('charts.timelineDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={delayTrend}>
                  <defs>
                    <linearGradient id="tramGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7E57FF" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#7E57FF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="busGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A06EFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#A06EFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ferryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4AEFF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#C4AEFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Area type="monotone" dataKey="tram" name={translateMode('Tram')} stroke="#7E57FF" fill="url(#tramGradient)" strokeWidth={2} />
                  <Area type="monotone" dataKey="bus" name={translateMode('Bus')} stroke="#A06EFF" fill="url(#busGradient)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ferry" name={translateMode('Ferry')} stroke="#C4AEFF" fill="url(#ferryGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('charts.rankingTitle')}</CardTitle>
            <CardDescription>{t('charts.rankingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lineDelayRanking.map((line) => {
              const widthPercent = Math.max(10, Math.round((line.avgDelaySeconds / maxLineDelay) * 100))
              return (
                <div key={line.line} className="grid grid-cols-[70px_1fr_55px] items-center gap-2 sm:grid-cols-[80px_1fr_70px] sm:gap-3">
                  <p className="text-sm font-medium">
                    {translateMode(line.mode)} {line.line}
                  </p>
                  <div className="relative h-9 rounded-xl bg-muted/80 p-1">
                    <div
                      className="flex h-full items-center justify-end rounded-lg pr-2"
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: getLineStyle(line.line).backgroundColor,
                        color: getLineStyle(line.line).textColor,
                      }}
                    >
                      <span className="rounded-full bg-black/20 p-1">{getModeIcon(line.mode)}</span>
                    </div>
                  </div>
                  <p className="text-right text-sm font-semibold">{line.avgDelaySeconds}s</p>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground">
              {lineColorsQuery.data && lineColorsQuery.data.length > 0 ? t('charts.colorsApi') : t('charts.colorsFallback')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('charts.distributionTitle')}</CardTitle>
            <CardDescription>{t('charts.distributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionByMode} barCategoryGap="20%" barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mode" tickFormatter={(value) => translateMode(value as LineMode)} stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Bar dataKey="p50" name="P50" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="p85" name="P85" fill="#6366F1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="p95" name="P95" fill="#4338CA" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t('drilldown.title')}</CardTitle>
          <CardDescription>{t('drilldown.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {filteredLines.map((line) => (
              <button
                key={line.line}
                type="button"
                className={`chip ${selectedLine === line.line ? 'chip-active' : ''}`}
                style={{
                  borderColor: getLineStyle(line.line).borderColor,
                  backgroundColor: getLineStyle(line.line).backgroundColor,
                  color: getLineStyle(line.line).textColor,
                }}
                onClick={() => setSelectedLine(line.line)}
              >
                {translateMode(line.mode)} {line.line}
              </button>
            ))}
          </div>

          {selectedLineStats ? (
            <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/40 p-4 text-sm md:grid-cols-2">
              <p>
                <strong>{t('drilldown.line')}:</strong> {translateMode(selectedLineStats.mode)} {selectedLineStats.line}
              </p>
              <p>
                <strong>{t('drilldown.district')}:</strong> {selectedLineStats.district}
              </p>
              <p>
                <strong>{t('drilldown.avgDelay')}:</strong> {selectedLineStats.avgDelaySeconds}s
              </p>
              <p>
                <strong>{t('drilldown.ontime')}:</strong> {selectedLineStats.onTimeRate}%
              </p>
              <p>
                <strong>{t('drilldown.crowding')}:</strong> {selectedLineStats.crowdingScore}/100
              </p>
              <p>
                <strong>{t('drilldown.cancellations')}:</strong> {selectedLineStats.canceledTrips}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('drilldown.empty')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug monitoring metrics</CardTitle>
          <CardDescription>Rolling 5-minute live diagnostics for polling and API reliability.</CardDescription>
        </CardHeader>
        <CardContent>
          {debugMetricsQuery.data ? (
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <p>
                <strong>Monitored stops:</strong> {debugMetricsQuery.data.monitored_stops_count}
              </p>
              <p>
                <strong>Poll requests (5m):</strong> {debugMetricsQuery.data.poll_requests_count_5m}
              </p>
              <p>
                <strong>Avg API response (5m):</strong> {Math.round(debugMetricsQuery.data.average_api_response_time_ms_5m)} ms
              </p>
              <p>
                <strong>Success rate (5m):</strong> {debugMetricsQuery.data.success_rate_percent_5m.toFixed(1)}%
              </p>
              <p>
                <strong>Poll cycles (5m):</strong> {debugMetricsQuery.data.poll_cycles_count_5m}
              </p>
              <p>
                <strong>Successful stop polls (5m):</strong> {debugMetricsQuery.data.successful_stop_polls_count_5m}
              </p>
              <p>
                <strong>Failed stop polls (5m):</strong> {debugMetricsQuery.data.failed_stop_polls_count_5m}
              </p>
              <p>
                <strong>Window:</strong> {debugMetricsQuery.data.window_minutes} minutes
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Debug metrics are unavailable right now.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
