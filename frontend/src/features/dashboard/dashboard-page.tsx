import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { BusFront, Languages, Moon, Ship, Sun, TramFront } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchLineColors, fetchMonitoredStops, fetchWorstLines } from '@/lib/api'

type CorridorMetric = {
  corridor: string
  avgDelaySeconds: number
  canceledDepartures: number
  ridership: number
  reliability: number
}

type ModalShare = {
  mode: LineMode
  value: number
}

type TrendPoint = {
  hour: string
  tram: number
  bus: number
  ferry: number
}

type LineMode = 'Tram' | 'Bus' | 'Ferry'

type LineDrilldown = {
  line: string
  mode: LineMode
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

const pieColors = ['#7E57FF', '#A06EFF', '#C4AEFF']



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

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const [selectedMode, setSelectedMode] = useState<'All' | LineMode>('All')
  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [selectedStop, setSelectedStop] = useState<string>('all')
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => document.documentElement.classList.contains('dark'))

  const lineColorsQuery = useQuery({
    queryKey: ['line-colors'],
    queryFn: fetchLineColors,
  })

  const monitoredStopsQuery = useQuery({
    queryKey: ['monitored-stops'],
    queryFn: fetchMonitoredStops,
  })

  const worstLinesQuery = useQuery({
    queryKey: ['worst-lines-by-stop', selectedStop],
    queryFn: () => fetchWorstLines(selectedStop === 'all' ? undefined : selectedStop),
  })

  const avgDelay = useMemo(
    () => Math.round(corridorMetrics.reduce((sum, corridor) => sum + corridor.avgDelaySeconds, 0) / corridorMetrics.length),
    [],
  )

  const reliability = useMemo(
    () => Math.round(corridorMetrics.reduce((sum, corridor) => sum + corridor.reliability, 0) / corridorMetrics.length),
    [],
  )

  const totalRidership = useMemo(() => corridorMetrics.reduce((sum, corridor) => sum + corridor.ridership, 0), [])

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

  const maxLineDelay = lineDelayRanking[0]?.avgDelaySeconds ?? 1

  const getModeIcon = (mode: LineMode) => {
    if (mode === 'Bus') {
      return <BusFront className="h-4 w-4" />
    }

    if (mode === 'Ferry') {
      return <Ship className="h-4 w-4" />
    }

    return <TramFront className="h-4 w-4" />
  }

  const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '')
    if (normalized.length !== 6) {
      return null
    }

    const bigint = Number.parseInt(normalized, 16)
    if (Number.isNaN(bigint)) {
      return null
    }

    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    }
  }

  const relativeLuminance = (hex: string) => {
    const rgb = hexToRgb(hex)
    if (!rgb) {
      return 0
    }

    const transform = (value: number) => {
      const channel = value / 255
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    }

    const r = transform(rgb.r)
    const g = transform(rgb.g)
    const b = transform(rgb.b)

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const contrastRatio = (hexA: string, hexB: string) => {
    const lumA = relativeLuminance(hexA)
    const lumB = relativeLuminance(hexB)
    const lighter = Math.max(lumA, lumB)
    const darker = Math.min(lumA, lumB)

    return (lighter + 0.05) / (darker + 0.05)
  }

  const readableTextColor = (backgroundColor: string, preferredTextColor: string) => {
    if (contrastRatio(backgroundColor, preferredTextColor) >= 4.5) {
      return preferredTextColor
    }

    const whiteContrast = contrastRatio(backgroundColor, '#FFFFFF')
    const darkContrast = contrastRatio(backgroundColor, '#111827')

    return whiteContrast >= darkContrast ? '#FFFFFF' : '#111827'
  }

  const getLineStyle = (line: string) => {
    const normalized = normalizeLineNumber(line)

    const resolved =
      lineStyles[line] ??
      lineStyles[normalized] ??
      fallbackLineStyles[normalized] ?? { backgroundColor: '#64748B', textColor: '#FFFFFF', borderColor: '#64748B' }

    return {
      ...resolved,
      textColor: readableTextColor(resolved.backgroundColor, resolved.textColor),
    }
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
    <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-8 md:px-8 lg:px-10">
      <header className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-[0_20px_65px_-30px_rgba(96,55,177,0.6)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium tracking-wide text-primary">{t('dashboard.badge')}</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t('dashboard.title')}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="toggle-btn" type="button" onClick={toggleLanguage}>
              <Languages className="h-4 w-4" /> {t('controls.language')}
            </button>
            <button className="toggle-btn" type="button" onClick={toggleTheme}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {t('controls.theme')}
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="kpi-card">
          <CardHeader className="pb-2">
            <CardDescription>{t('kpis.networkDelay')}</CardDescription>
            <CardTitle>{formatKpi(avgDelay, 's')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{t('kpis.networkDelayDesc')}</CardContent>
        </Card>
        <Card className="kpi-card">
          <CardHeader className="pb-2">
            <CardDescription>{t('kpis.reliability')}</CardDescription>
            <CardTitle>{formatKpi(reliability, '%')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{t('kpis.reliabilityDesc')}</CardContent>
        </Card>
        <Card className="kpi-card">
          <CardHeader className="pb-2">
            <CardDescription>{t('kpis.ridership')}</CardDescription>
            <CardTitle>{formatKpi(totalRidership, '')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{t('kpis.ridershipDesc')}</CardContent>
        </Card>
        <Card className="kpi-card">
          <CardHeader className="pb-2">
            <CardDescription>{t('kpis.monitoredStops')}</CardDescription>
            <CardTitle>{formatKpi(monitoredStopsQuery.data?.length ?? 0, '')}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{t('kpis.monitoredStopsDesc')}</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('filters.title')}</CardTitle>
            <CardDescription>{t('filters.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="stop-filter">
                {t('filters.stop')}
              </label>
              <select id="stop-filter" className="input-select" value={selectedStop} onChange={(event) => setSelectedStop(event.target.value)}>
                <option value="all">{t('filters.allStops')}</option>
                {(monitoredStopsQuery.data ?? []).map((stop) => (
                  <option key={stop.stop_gid} value={stop.stop_gid}>
                    {stop.stop_gid}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['All', 'Tram', 'Bus', 'Ferry'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`chip ${selectedMode === mode ? 'chip-active' : ''}`}
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

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>{t('charts.timelineTitle')}</CardTitle>
            <CardDescription>{t('charts.timelineDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={delayTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="hour" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="tram" stackId="1" name={translateMode('Tram')} stroke="#7E57FF" fill="#7E57FF" fillOpacity={0.45} />
                  <Area type="monotone" dataKey="bus" stackId="1" name={translateMode('Bus')} stroke="#A06EFF" fill="#A06EFF" fillOpacity={0.38} />
                  <Area type="monotone" dataKey="ferry" stackId="1" name={translateMode('Ferry')} stroke="#C4AEFF" fill="#C4AEFF" fillOpacity={0.4} />
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
              const widthPercent = Math.max(8, Math.round((line.avgDelaySeconds / maxLineDelay) * 100))
              return (
                <div key={line.line} className="grid grid-cols-[76px_1fr_56px] items-center gap-3">
                  <p className="text-sm font-medium">
                    {translateMode(line.mode)} {line.line}
                  </p>
                  <div className="relative h-9 rounded-xl bg-muted/80 p-1">
                    <div
                      className="flex h-full items-center justify-end rounded-lg pr-2 text-white"
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: getLineStyle(line.line).backgroundColor,
                        color: getLineStyle(line.line).textColor,
                      }}
                    >
                      <span className="rounded-full bg-black/25 p-1">{getModeIcon(line.mode)}</span>
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
            <CardTitle>{t('charts.modalTitle')}</CardTitle>
            <CardDescription>{t('charts.modalDesc')}</CardDescription>
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
                    label={(payload) => translateMode(payload.mode as LineMode)}
                    onClick={(entry) => setSelectedMode(entry.mode as LineMode)}
                  >
                    {modalSplit.map((entry, index) => (
                      <Cell key={entry.mode} fill={pieColors[index % pieColors.length]} className="cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(value) => translateMode(value as LineMode)} />
                </PieChart>
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
    </main>
  )
}
