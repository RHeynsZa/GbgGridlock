import axios from 'axios'

export type WorstLine = {
  line_number: string
  avg_delay_seconds: number
  sample_size: number
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
}

export type MonitoredStop = {
  stop_gid: string
}

type WorstLinesResponse = WorstLine[] | { rows?: WorstLine[]; data?: WorstLine[] }
type MonitoredStopsResponse = MonitoredStop[] | { rows?: MonitoredStop[]; data?: MonitoredStop[] }

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

export async function fetchWorstLines(stopGid?: string) {
  try {
    const { data } = await api.get<WorstLinesResponse>('/api/v1/delays/by-stop', {
      params: stopGid ? { stop_gid: stopGid } : undefined,
    })
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
