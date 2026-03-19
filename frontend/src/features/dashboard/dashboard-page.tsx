import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, BusFront, Languages, Moon, Ship, Sun, TramFront, TriangleAlert, Waves } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchDebugMetrics, fetchDelayDistribution, fetchHourlyTrend, fetchLineColors, fetchLineDetails, fetchMonitoredStops, fetchNetworkStats, fetchWorstLines } from '@/lib/api'

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

function mapTransportModeToLineMode(transportMode: string | null | undefined): LineMode {
  if (!transportMode) {
    return 'Bus'
  }

  const normalized = transportMode.toLowerCase()
  if (normalized === 'tram') {
    return 'Tram'
  }
  if (normalized === 'ferry' || normalized === 'boat') {
    return 'Ferry'
  }

  return 'Bus'
}

type TimeRange = {
  label: string
  minutes: number
  hours?: number
}

const TIME_RANGES: TimeRange[] = [
  { label: '1 hour', minutes: 60, hours: 1 },
  { label: '6 hours', minutes: 360, hours: 6 },
  { label: '24 hours', minutes: 1440, hours: 24 },
  { label: '7 days', minutes: 10080, hours: 168 },
  { label: '30 days', minutes: 43200, hours: 720 },
]

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const [selectedMode, setSelectedMode] = useState<'All' | LineMode>('All')
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [selectedStop, setSelectedStop] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[0])
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => document.documentElement.classList.contains('dark'))

  const lineColorsQuery = useQuery({ queryKey: ['line-colors'], queryFn: fetchLineColors })
  const monitoredStopsQuery = useQuery({ queryKey: ['monitored-stops'], queryFn: fetchMonitoredStops })
  const worstLinesQuery = useQuery({
    queryKey: ['worst-lines-by-stop', selectedStop, timeRange.minutes],
    queryFn: () => fetchWorstLines(selectedStop === 'all' ? undefined : selectedStop, timeRange.minutes),
  })
  const debugMetricsQuery = useQuery({
    queryKey: ['debug-metrics'],
    queryFn: fetchDebugMetrics,
    refetchInterval: 30_000,
  })
  const networkStatsQuery = useQuery({
    queryKey: ['network-stats', timeRange.minutes],
    queryFn: () => fetchNetworkStats(timeRange.minutes),
  })
  const hourlyTrendQuery = useQuery({
    queryKey: ['hourly-trend', timeRange.hours],
    queryFn: () => fetchHourlyTrend(timeRange.hours || 24),
  })
  const lineDetailsQuery = useQuery({
    queryKey: ['line-details', timeRange.minutes],
    queryFn: () => fetchLineDetails(timeRange.minutes),
  })

  const delayDistributionQuery = useQuery({
    queryKey: ['delay-distribution', selectedLine, timeRange.minutes],
    queryFn: () => {
      const lineToFetch = selectedLine || worstLinesQuery.data?.[0]?.line_number
      if (!lineToFetch) return Promise.resolve([])
      return fetchDelayDistribution(lineToFetch, timeRange.minutes)
    },
    enabled: !!(selectedLine || worstLinesQuery.data?.[0]?.line_number),
  })

  const avgDelay = useMemo(
    () => Math.round(networkStatsQuery.data?.avg_delay_seconds ?? 0),
    [networkStatsQuery.data],
  )
  const reliability = useMemo(
    () => Math.round(networkStatsQuery.data?.reliability_percent ?? 0),
    [networkStatsQuery.data],
  )

  const cancellationRate = useMemo(() => {
    return Number((networkStatsQuery.data?.cancellation_rate_percent ?? 0).toFixed(1))
  }, [networkStatsQuery.data])

  const p95Delay = useMemo(() => {
    return Math.round(networkStatsQuery.data?.p95_delay_seconds ?? 0)
  }, [networkStatsQuery.data])

  const lineDrilldown = useMemo<LineDrilldown[]>(() => {
    if (!lineDetailsQuery.data) return []
    
    return lineDetailsQuery.data.map((line) => ({
      line: line.line_number,
      mode: mapTransportModeToLineMode(line.transport_mode),
      district: 'Unknown',
      avgDelaySeconds: Math.round(line.avg_delay_seconds),
      crowdingScore: 0,
      canceledTrips: line.canceled_trips,
      onTimeRate: Math.round(line.on_time_rate_percent),
    }))
  }, [lineDetailsQuery.data])

  const filteredLines = useMemo(
    () => lineDrilldown.filter((line) => (selectedMode === 'All' ? true : line.mode === selectedMode)),
    [selectedMode, lineDrilldown],
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
          mode: mapTransportModeToLineMode(line.transport_mode),
          avgDelaySeconds: Math.round(line.avg_delay_seconds),
        }))
        .sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds)
    }

    return [...lineDrilldown].sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds)
  }, [worstLinesQuery.data])

  const delayDistributionData = useMemo(() => {
    const buckets = delayDistributionQuery.data || []
    return buckets.map((bucket) => ({
      delayRange: `${Math.floor(bucket.bucket_seconds / 60)}m`,
      departures: bucket.departures,
    }))
  }, [delayDistributionQuery.data])

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
    <main className="min-h-screen w-full">
      <div className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md sm:h-12 sm:w-12">
                <TramFront className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">GbgGridlock</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">{t('dashboard.subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="toggle-btn" type="button" onClick={toggleLanguage} aria-label="Toggle language">
                <Languages className="h-4 w-4" />
                <span className="hidden sm:inline">{t('controls.language')}</span>
              </button>
              <button className="toggle-btn" type="button" onClick={toggleTheme} aria-label="Toggle theme">
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="hidden sm:inline">{t('controls.theme')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:space-y-8 lg:px-8 lg:py-8">

        <section>
          <div className="mb-3 sm:mb-4">
            <h2 className="text-base font-semibold text-foreground sm:text-lg md:text-xl">Network Overview</h2>
            <p className="text-xs text-muted-foreground sm:text-sm">Last {timeRange.label}</p>
          </div>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { 
                title: t('kpis.networkDelay'), 
                value: formatKpi(avgDelay, 's'), 
                icon: <TriangleAlert className="h-4 w-4 sm:h-5 sm:w-5" />, 
                note: t('kpis.networkDelayDesc'),
                color: 'text-warning'
              },
              { 
                title: t('kpis.p95Delay'), 
                value: formatKpi(p95Delay, 's'), 
                icon: <Waves className="h-4 w-4 sm:h-5 sm:w-5" />, 
                note: t('kpis.p95DelayDesc'),
                color: 'text-error'
              },
              { 
                title: t('kpis.reliability'), 
                value: formatKpi(reliability, '%'), 
                icon: <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />, 
                note: t('kpis.reliabilityDesc'),
                color: 'text-success'
              },
              {
                title: t('kpis.cancellationRate'),
                value: formatKpi(cancellationRate, '%'),
                icon: <BusFront className="h-4 w-4 sm:h-5 sm:w-5" />,
                note: t('kpis.cancellationRateDesc'),
                color: 'text-primary'
              },
            ].map((kpi) => (
              <Card key={kpi.title} className="kpi-card rounded-xl">
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="flex items-start justify-between">
                    <CardDescription className="text-[10px] font-medium uppercase tracking-wider sm:text-xs">
                      {kpi.title}
                    </CardDescription>
                    <div className={`rounded-lg bg-muted p-1.5 sm:p-2 ${kpi.color}`}>
                      {kpi.icon}
                    </div>
                  </div>
                  <CardTitle className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl md:text-4xl">{kpi.value}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-[10px] text-muted-foreground sm:text-xs">
                  {kpi.note}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Card className="rounded-xl shadow-md">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-sm sm:text-base">{t('filters.title')}</CardTitle>
                <CardDescription className="text-xs">{t('filters.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-5">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs font-medium text-foreground sm:text-sm" htmlFor="time-range-filter">
                    Time Range
                  </label>
                  <select 
                    id="time-range-filter" 
                    className="input-select" 
                    value={timeRange.label} 
                    onChange={(event) => {
                      const selected = TIME_RANGES.find(tr => tr.label === event.target.value)
                      if (selected) setTimeRange(selected)
                    }}
                  >
                    {TIME_RANGES.map((tr) => (
                      <option key={tr.label} value={tr.label}>
                        {tr.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs font-medium text-foreground sm:text-sm" htmlFor="stop-filter">
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

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs font-medium text-foreground sm:text-sm">Transport Mode</label>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    {(['All', 'Tram', 'Bus'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`chip justify-center ${selectedMode === mode ? 'chip-active' : ''}`}
                        onClick={() => {
                          setSelectedMode(mode)
                          setSelectedLine(null)
                        }}
                      >
                        {getModeIcon(mode as LineMode)}
                        <span>{translateMode(mode)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-9">
            <Card className="rounded-xl shadow-md">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-sm sm:text-base">{t('charts.timelineTitle')}</CardTitle>
                <CardDescription className="text-xs">{t('charts.timelineDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyTrendQuery.data ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tramGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="busGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ferryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="hour" 
                    stroke="var(--muted-foreground)"
                    style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickFormatter={(value) => {
                      const parts = value.split(' ')
                      if (parts.length === 2) {
                        const [date, time] = parts
                        const hourlyData = hourlyTrendQuery.data ?? []
                        const uniqueDates = new Set(hourlyData.map((d) => d.hour.split(' ')[0]))
                        return uniqueDates.size > 1 ? `${date.substring(5)} ${time.substring(0, 5)}` : time.substring(0, 5)
                      }
                      return value
                    }}
                  />
                  <YAxis 
                    stroke="var(--muted-foreground)"
                    style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    label={{ 
                      value: 'Delay (s)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'var(--muted-foreground)', fontSize: '12px' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--card-foreground)',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    labelStyle={{
                      color: 'var(--foreground)',
                      fontWeight: 600,
                      marginBottom: '4px'
                    }}
                    labelFormatter={(value) => String(value).replace(' ', ' @ ')}
                  />
                  <Area type="monotone" dataKey="tram" name={translateMode('Tram')} stroke="var(--chart-1)" fill="url(#tramGradient)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="bus" name={translateMode('Bus')} stroke="var(--chart-2)" fill="url(#busGradient)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="ferry" name={translateMode('Ferry')} stroke="var(--chart-3)" fill="url(#ferryGradient)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="rounded-xl shadow-md">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-sm sm:text-base">{t('charts.rankingTitle')}</CardTitle>
            <CardDescription className="text-xs">{t('charts.rankingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {lineDelayRanking.length > 0 ? (
              <>
                {lineDelayRanking.map((line, index) => {
                  const widthPercent = Math.max(10, Math.round((line.avgDelaySeconds / maxLineDelay) * 100))
                  return (
                    <div key={line.line} className="group cursor-pointer">
                      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted/50 sm:gap-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground sm:h-6 sm:w-6 sm:text-xs">
                            {index + 1}
                          </span>
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            {getModeIcon(line.mode)}
                            <p className="text-xs font-semibold sm:text-sm">{line.line}</p>
                          </div>
                        </div>
                        <div className="relative h-8 rounded-lg bg-muted sm:h-10">
                          <div
                            className="flex h-full items-center justify-end rounded-lg border-l-4 bg-card px-1.5 transition-all duration-300 group-hover:shadow-sm sm:px-2"
                            style={{
                              width: `${widthPercent}%`,
                              borderLeftColor: getLineStyle(line.line).backgroundColor,
                            }}
                          >
                            <span className="text-[10px] font-bold text-foreground sm:text-xs">{line.avgDelaySeconds}s</span>
                          </div>
                        </div>
                        <p className="text-right text-xs font-bold tabular-nums sm:text-sm">{line.avgDelaySeconds}s</p>
                      </div>
                    </div>
                  )
                })}
                <div className="mt-3 rounded-lg bg-muted/30 p-2 sm:mt-4 sm:p-3">
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    {lineColorsQuery.data && lineColorsQuery.data.length > 0 ? t('charts.colorsApi') : t('charts.colorsFallback')}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <p className="text-sm">No ranking data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-md">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-sm sm:text-base">{t('drilldown.title')}</CardTitle>
            <CardDescription className="text-xs">{t('drilldown.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-5">
            {filteredLines.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {filteredLines.map((line) => (
                    <button
                      key={line.line}
                      type="button"
                      className={`chip flex items-center gap-1.5 ${selectedLine === line.line ? 'border-l-4' : ''}`}
                      style={
                        selectedLine === line.line
                          ? {
                              borderLeftColor: getLineStyle(line.line).backgroundColor,
                            }
                          : {}
                      }
                      onClick={() => setSelectedLine(line.line)}
                    >
                      {getModeIcon(line.mode)}
                      <span>{line.line}</span>
                    </button>
                  ))}
                </div>

                {selectedLineStats ? (
                  <div 
                    className="rounded-xl border-l-4 border-border bg-muted/30 p-3 sm:p-5"
                    style={{
                      borderLeftColor: getLineStyle(selectedLineStats.line).backgroundColor,
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2 sm:mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 bg-card text-sm font-bold text-foreground sm:h-10 sm:w-10"
                        style={{
                          borderColor: getLineStyle(selectedLineStats.line).backgroundColor,
                        }}
                      >
                        {selectedLineStats.line}
                      </div>
                      <div>
                        <p className="text-xs font-semibold sm:text-sm">{translateMode(selectedLineStats.mode)} Line {selectedLineStats.line}</p>
                        <p className="text-[10px] text-muted-foreground sm:text-xs">Detailed statistics</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">{t('drilldown.avgDelay')}</p>
                        <p className="text-xl font-bold sm:text-2xl">{selectedLineStats.avgDelaySeconds}s</p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">{t('drilldown.ontime')}</p>
                        <p className="text-xl font-bold text-success sm:text-2xl">{selectedLineStats.onTimeRate}%</p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">{t('drilldown.cancellations')}</p>
                        <p className="text-xl font-bold text-error sm:text-2xl">{selectedLineStats.canceledTrips}</p>
                      </div>
                    </div>
                  </div>
                ) : (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border sm:h-24">
                <p className="text-xs text-muted-foreground sm:text-sm">{t('drilldown.empty')}</p>
              </div>
                )}
              </>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <p className="text-sm">No line data available for selected filters</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-md">
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base">
                  {t('charts.distributionTitle')}
                  {(selectedLine || worstLinesQuery.data?.[0]?.line_number) && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      (Line {selectedLine || worstLinesQuery.data?.[0]?.line_number})
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">{t('charts.distributionDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full sm:h-[360px]">
              {delayDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={delayDistributionData} barCategoryGap="20%" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} strokeOpacity={0.5} />
                    <XAxis 
                      dataKey="delayRange" 
                      stroke="var(--muted-foreground)"
                      style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis 
                      stroke="var(--muted-foreground)" 
                      label={{ 
                        value: 'Departures', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: 'var(--muted-foreground)', fontSize: '12px' }
                      }}
                      style={{ fill: 'var(--muted-foreground)', fontSize: '12px' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--card-foreground)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      labelStyle={{
                        color: 'var(--foreground)',
                        fontWeight: 600,
                        marginBottom: '4px'
                      }}
                    />
                    <Bar 
                      dataKey="departures" 
                      name="Departures" 
                      fill="var(--chart-1)" 
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    {delayDistributionQuery.isLoading ? 'Loading distribution data...' : 'No delay distribution data available'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-dashed shadow-md">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-sm sm:text-base">System Diagnostics</CardTitle>
            <CardDescription className="text-xs">Live monitoring metrics for polling and API reliability</CardDescription>
          </CardHeader>
          <CardContent>
            {debugMetricsQuery.data ? (
              <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monitored Stops</p>
                  <p className="text-xl font-bold">{debugMetricsQuery.data.monitored_stops_count}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Poll Requests (5m)</p>
                  <p className="text-xl font-bold">{debugMetricsQuery.data.poll_requests_count_5m}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Response Time</p>
                  <p className="text-xl font-bold">{Math.round(debugMetricsQuery.data.average_api_response_time_ms_5m)}ms</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Success Rate (5m)</p>
                  <p className="text-xl font-bold text-success">{debugMetricsQuery.data.success_rate_percent_5m.toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Poll Cycles (5m)</p>
                  <p className="text-xl font-bold">{debugMetricsQuery.data.poll_cycles_count_5m}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Successful Polls</p>
                  <p className="text-xl font-bold text-success">{debugMetricsQuery.data.successful_stop_polls_count_5m}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Failed Polls</p>
                  <p className="text-xl font-bold text-error">{debugMetricsQuery.data.failed_stop_polls_count_5m}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Window</p>
                  <p className="text-xl font-bold">{debugMetricsQuery.data.window_minutes}min</p>
                </div>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">Debug metrics are unavailable</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
