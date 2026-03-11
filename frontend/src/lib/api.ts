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

export type LineMetadata = {
  line_number: string
  foreground_color: string | null
  background_color: string | null
  text_color: string | null
  border_color: string | null
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

function normalizeLineMetadata(metadata: LineMetadata[]): LineColor[] {
  return metadata
    .map((line) => {
      const lineNumber = line.line_number
      const hexColor = line.background_color || line.foreground_color

      if (!lineNumber || !hexColor) {
        return null
      }

      return {
        lineNumber,
        hexColor: hexColor.startsWith('#') ? hexColor : `#${hexColor}`,
      }
    })
    .filter((entry): entry is LineColor => Boolean(entry))
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
