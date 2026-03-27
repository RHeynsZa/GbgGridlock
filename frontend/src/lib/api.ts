import axios from 'axios'

export type WorstLine = {
  line_number: string
  avg_delay_seconds: number
  sample_size: number
  transport_mode: string | null
}

export type LineStyle = {
  lineNumber: string
  backgroundColor: string
  textColor: string
  borderColor: string
}

export type LineMetadata = {
  line_number: string
  foreground_color: string | null
  background_color: string | null
  text_color: string | null
  border_color: string | null
  transport_mode: string | null
}

export type MonitoredStop = {
  stop_gid: string
  stop_name: string
}

export type BottleneckStop = {
  stop_gid: string
  severe_or_cancelled_count: number
  total_departures: number
}

export type DebugMetrics = {
  window_minutes: number
  monitored_stops_count: number
  poll_requests_count_5m: number
  successful_poll_requests_count_5m: number
  average_api_response_time_ms_5m: number
  success_rate_percent_5m: number
  poll_cycles_count_5m: number
  successful_stop_polls_count_5m: number
  failed_stop_polls_count_5m: number
}

export type NetworkStats = {
  avg_delay_seconds: number
  reliability_percent: number
  cancellation_rate_percent: number
  p95_delay_seconds: number
  sample_size: number
}

export type HourlyTrendPoint = {
  hour: string
  tram: number
  bus: number
  ferry: number
}

export type LineDetail = {
  line_number: string
  transport_mode: string | null
  avg_delay_seconds: number
  on_time_rate_percent: number
  canceled_trips: number
  sample_size: number
}

export type DelayDistributionBucket = {
  bucket_seconds: number
  departures: number
}

type WorstLinesResponse = WorstLine[] | { rows?: WorstLine[]; data?: WorstLine[] }
type MonitoredStopsResponse = MonitoredStop[] | { rows?: MonitoredStop[]; data?: MonitoredStop[] }
type BottlenecksResponse = BottleneckStop[] | { rows?: BottleneckStop[]; data?: BottleneckStop[] }

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'https://gbggridlock-production.up.railway.app',
  timeout: 10_000,
})

function normalizeWorstLines(payload: WorstLinesResponse): WorstLine[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

function normalizeMonitoredStops(payload: MonitoredStopsResponse): MonitoredStop[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

function normalizeBottlenecks(payload: BottlenecksResponse): BottleneckStop[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

export async function fetchWorstLines(stopGid?: string, windowMinutes: number = 60) {
  try {
    const params: Record<string, string | number> = { window_minutes: windowMinutes }
    if (stopGid) {
      params.stop_gid = stopGid
    }
    const { data } = await api.get<WorstLinesResponse>('/api/v1/delays/by-stop', { params })
    return normalizeWorstLines(data)
  } catch (error) {
    console.warn('Failed to fetch delay breakdown from backend:', error)
    return []
  }
}

export async function fetchMonitoredStops() {
  try {
    const { data } = await api.get<MonitoredStopsResponse>('/api/v1/stops/monitored')
    return normalizeMonitoredStops(data)
  } catch (error) {
    console.warn('Failed to fetch monitored stops from backend:', error)
    return []
  }
}

export async function fetchBottlenecks(windowMinutes: number = 1440, limit: number = 10) {
  try {
    const { data } = await api.get<BottlenecksResponse>('/api/v1/stops/bottlenecks', {
      params: {
        window_minutes: windowMinutes,
        limit,
      },
    })
    return normalizeBottlenecks(data)
  } catch (error) {
    console.warn('Failed to fetch bottlenecks from backend:', error)
    return []
  }
}

function normalizeHex(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return value.startsWith('#') ? value : `#${value}`
}

function normalizeLineMetadata(metadata: LineMetadata[]): LineStyle[] {
  return metadata
    .map((line) => {
      const lineNumber = line.line_number
      const backgroundColor = normalizeHex(line.background_color) ?? normalizeHex(line.foreground_color)

      if (!lineNumber || !backgroundColor) {
        return null
      }

      return {
        lineNumber,
        backgroundColor,
        textColor: normalizeHex(line.text_color) ?? '#FFFFFF',
        borderColor: normalizeHex(line.border_color) ?? backgroundColor,
      }
    })
    .filter((entry): entry is LineStyle => Boolean(entry))
}

export async function fetchLineColors() {
  try {
    const { data } = await api.get<LineMetadata[]>('/api/v1/lines/metadata')
    return normalizeLineMetadata(data)
  } catch (error) {
    console.warn('Failed to fetch line metadata from backend:', error)
    return []
  }
}

export async function fetchDebugMetrics() {
  try {
    const { data } = await api.get<DebugMetrics>('/api/v1/debug/metrics')
    return data
  } catch (error) {
    console.warn('Failed to fetch debug metrics from backend:', error)
    return null
  }
}

export async function fetchNetworkStats(windowMinutes: number = 60) {
  try {
    const { data } = await api.get<NetworkStats>('/api/v1/stats/network', {
      params: { window_minutes: windowMinutes },
    })
    return data
  } catch (error) {
    console.warn('Failed to fetch network stats from backend:', error)
    return null
  }
}

export async function fetchHourlyTrend(windowHours: number = 24) {
  try {
    const { data } = await api.get<HourlyTrendPoint[]>('/api/v1/stats/hourly-trend', {
      params: { window_hours: windowHours },
    })
    return data
  } catch (error) {
    console.warn('Failed to fetch hourly trend from backend:', error)
    return []
  }
}

export async function fetchLineDetails(windowMinutes: number = 60) {
  try {
    const { data } = await api.get<LineDetail[]>('/api/v1/lines/details', {
      params: { window_minutes: windowMinutes },
    })
    return data
  } catch (error) {
    console.warn('Failed to fetch line details from backend:', error)
    return []
  }
}

export async function fetchDelayDistribution(lineNumber: string, windowMinutes: number = 1440) {
  try {
    const { data } = await api.get<DelayDistributionBucket[]>(`/api/v1/delays/distribution/${lineNumber}`, {
      params: { window_minutes: windowMinutes },
    })
    return data
  } catch (error) {
    console.warn('Failed to fetch delay distribution from backend:', error)
    return []
  }
}
