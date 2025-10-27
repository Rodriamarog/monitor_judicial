/**
 * Date/Time Utilities for Tijuana Timezone
 * Converts UTC timestamps to America/Tijuana (Pacific Time)
 */

const TIJUANA_TIMEZONE = 'America/Tijuana'

/**
 * Format a UTC date string to Tijuana local date
 * @param utcDate - ISO 8601 date string from database
 * @returns Formatted date in Spanish (DD/MM/YYYY)
 */
export function formatTijuanaDate(utcDate: string | Date): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIJUANA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * Format a UTC date string to Tijuana local time
 * @param utcDate - ISO 8601 date string from database
 * @returns Formatted time (HH:MM:SS a.m./p.m.)
 */
export function formatTijuanaTime(utcDate: string | Date): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIJUANA_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Format a UTC date string to Tijuana local date and time
 * @param utcDate - ISO 8601 date string from database
 * @returns Formatted datetime (DD/MM/YYYY HH:MM:SS a.m./p.m.)
 */
export function formatTijuanaDateTime(utcDate: string | Date): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIJUANA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date)
}
