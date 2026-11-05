import type { DayEntry, Settings } from './types'
import { dayMinutes, defaultDayMinutes, minutesToAulas } from './time'

export type DayBalance = {
  minutes: number
  deltaMinutes: number
  deltaAulas: number
}

export function balanceForDay(entry: DayEntry, settings: Settings): DayBalance {
  const minutes = dayMinutes(entry)
  const deltaMinutes = minutes - defaultDayMinutes(settings)
  return {
    minutes,
    deltaMinutes,
    deltaAulas: minutesToAulas(deltaMinutes, settings.minutesPerAula),
  }
}

/** Como dias sem registro valem zero, o total é a soma dos lançamentos. */
export function totalDeltaMinutes(entries: DayEntry[], settings: Settings): number {
  return entries.reduce(
    (total, entry) => total + balanceForDay(entry, settings).deltaMinutes,
    0,
  )
}

export function totalAulas(entries: DayEntry[], settings: Settings): number {
  return minutesToAulas(totalDeltaMinutes(entries, settings), settings.minutesPerAula)
}

export function monthKey(date: string): string {
  return date.slice(0, 7)
}
