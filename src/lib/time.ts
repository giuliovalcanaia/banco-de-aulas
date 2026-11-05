import { AFTERNOON_BREAK, MORNING_BREAK } from './schedule'
import type { DayEntry, Settings, TimeRange } from './types'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value)
}

export function timeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function breakOverlap(range: TimeRange, window: TimeRange): number {
  const start = timeToMinutes(range.start)
  const end = timeToMinutes(range.end)
  const windowStart = timeToMinutes(window.start)
  const windowEnd = timeToMinutes(window.end)

  if (start === null || end === null || windowStart === null || windowEnd === null) {
    return 0
  }

  return Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart))
}

/**
 * Minutos de um intervalo, descontando opcionalmente o lanche.
 * Intervalo inválido ou invertido vale 0.
 */
export function rangeMinutes(
  range: TimeRange | null,
  breakWindow?: TimeRange,
): number {
  if (!range) return 0
  const start = timeToMinutes(range.start)
  const end = timeToMinutes(range.end)
  if (start === null || end === null || end <= start) return 0

  const breakMinutes = breakWindow ? breakOverlap(range, breakWindow) : 0
  return Math.max(0, end - start - breakMinutes)
}

export function dayMinutes(day: Pick<DayEntry, 'morning' | 'afternoon'>): number {
  return (
    rangeMinutes(day.morning, MORNING_BREAK) +
    rangeMinutes(day.afternoon, AFTERNOON_BREAK)
  )
}

export function defaultDayMinutes(settings: Settings): number {
  return (
    rangeMinutes(settings.defaultMorning, MORNING_BREAK) +
    rangeMinutes(settings.defaultAfternoon, AFTERNOON_BREAK)
  )
}

/** Formata minutos como "1h30", "45min" ou "0h". */
export function formatDuration(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : ''
  const abs = Math.abs(Math.round(totalMinutes))
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60

  if (hours === 0 && minutes === 0) return '0h'
  if (hours === 0) return `${sign}${minutes}min`
  return `${sign}${hours}h${String(minutes).padStart(2, '0')}`
}

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

export function minutesToAulas(minutes: number, minutesPerAula: number): number {
  return minutes / minutesPerAula
}

export function formatAulas(minutes: number, minutesPerAula: number): string {
  return numberFormatter.format(minutesToAulas(minutes, minutesPerAula))
}

/** Formata aulas com sinal explícito quando positivo: "+1,88". */
export function formatSignedAulas(minutes: number, minutesPerAula: number): string {
  const aulas = minutesToAulas(minutes, minutesPerAula)
  const formatted = numberFormatter.format(aulas)
  return aulas > 0 ? `+${formatted}` : formatted
}

/** Equivalente em dias de folga, com uma casa decimal. */
export function formatDaysOff(totalMinutes: number, dayMinutesValue: number): string {
  if (dayMinutesValue <= 0) return '0'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(
    totalMinutes / dayMinutesValue,
  )
}
