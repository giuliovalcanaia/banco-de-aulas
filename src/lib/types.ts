export type TimeRange = {
  start: string
  end: string
}

export type DayEntry = {
  id: string
  /** Data no formato YYYY-MM-DD. */
  date: string
  morning: TimeRange | null
  afternoon: TimeRange | null
  note: string
  updatedAt: string
}

export type Settings = {
  defaultMorning: TimeRange
  defaultAfternoon: TimeRange
  /** Quantos minutos valem uma aula. */
  minutesPerAula: number
  /** Dias da semana considerados úteis (0 = domingo, 6 = sábado). */
  workdays: number[]
}

export type StoreData = {
  schemaVersion: number
  settings: Settings
  entries: DayEntry[]
}
