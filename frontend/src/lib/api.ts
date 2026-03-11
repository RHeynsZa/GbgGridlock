import axios from 'axios'

export type WorstLine = {
  line_number: string
  avg_delay_seconds: number
  sample_size: number
}

export type LineColor = {
  lineNumber: string
  hexColor: string
}

type WorstLinesResponse = WorstLine[] | { rows?: WorstLine[]; data?: WorstLine[] }

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
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

export async function fetchWorstLines() {
  const { data } = await api.get<WorstLinesResponse>('/api/v1/delays/worst-lines')
  return normalizeWorstLines(data)
}

type LineColorsResponse =
  | LineColor[]
  | {
      rows?: Array<{ line_number?: string; lineNumber?: string; color?: string; hexColor?: string }>
      data?: Array<{ line_number?: string; lineNumber?: string; color?: string; hexColor?: string }>
    }

function normalizeLineColors(payload: LineColorsResponse): LineColor[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.rows) ? payload.rows : payload.data ?? []

  return rows
    .map((row) => {
      const lineNumber = 'lineNumber' in row ? row.lineNumber : row.line_number
      const hexColor = 'hexColor' in row ? row.hexColor : row.color

      if (!lineNumber || !hexColor) {
        return null
      }

      return {
        lineNumber,
        hexColor,
      }
    })
    .filter((entry): entry is LineColor => Boolean(entry))
}

export async function fetchLineColors() {
  const lineColorsEndpoint = import.meta.env.VITE_LINE_COLORS_ENDPOINT

  if (!lineColorsEndpoint) {
    return []
  }

  const { data } = await axios.get<LineColorsResponse>(lineColorsEndpoint, {
    timeout: 10_000,
  })

  return normalizeLineColors(data)
}
