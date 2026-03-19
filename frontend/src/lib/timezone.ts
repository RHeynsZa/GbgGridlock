import { DateTime } from 'luxon'

const STOCKHOLM_TIMEZONE = 'Europe/Stockholm'

export function formatTimeForDisplay(utcTimestamp: string | Date, format: string = 'yyyy-MM-dd HH:mm'): string {
  const dt = typeof utcTimestamp === 'string' 
    ? DateTime.fromISO(utcTimestamp, { zone: 'utc' })
    : DateTime.fromJSDate(utcTimestamp, { zone: 'utc' })
  
  return dt.setZone(STOCKHOLM_TIMEZONE).toFormat(format)
}

export function formatHourForChart(utcTimestamp: string | Date, showDate: boolean = false): string {
  const dt = typeof utcTimestamp === 'string'
    ? DateTime.fromISO(utcTimestamp, { zone: 'utc' })
    : DateTime.fromJSDate(utcTimestamp, { zone: 'utc' })
  
  const local = dt.setZone(STOCKHOLM_TIMEZONE)
  
  if (showDate) {
    return local.toFormat('MM-dd HH:mm')
  }
  
  return local.toFormat('HH:mm')
}

export function toStockholmTime(utcTimestamp: string | Date): DateTime {
  const dt = typeof utcTimestamp === 'string'
    ? DateTime.fromISO(utcTimestamp, { zone: 'utc' })
    : DateTime.fromJSDate(utcTimestamp, { zone: 'utc' })
  
  return dt.setZone(STOCKHOLM_TIMEZONE)
}

export function getCurrentStockholmTime(): DateTime {
  return DateTime.now().setZone(STOCKHOLM_TIMEZONE)
}
