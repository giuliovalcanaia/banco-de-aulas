import type { TimeRange } from './types'

export type SchedulePeriod = {
  label: string
  times: string[]
}

/** Intervalos de lanche que não contam como aula. */
export const MORNING_BREAK: TimeRange = { start: '09:30', end: '09:45' }
export const AFTERNOON_BREAK: TimeRange = { start: '15:15', end: '15:30' }

/**
 * Horários de início e fim das aulas, incluindo os limites dos intervalos
 * de lanche. Alimentam os menus de seleção de horário do app.
 */
export const SCHEDULE_PERIODS: SchedulePeriod[] = [
  {
    label: 'Manhã',
    times: [
      '07:15',
      '08:00',
      '08:45',
      '09:30',
      '09:45',
      '10:30',
      '11:15',
      '12:00',
    ],
  },
  {
    label: 'Tarde',
    times: [
      '13:00',
      '13:45',
      '14:30',
      '15:15',
      '15:30',
      '16:15',
      '17:00',
      '17:45',
    ],
  },
]

export const SCHEDULE_TIMES = SCHEDULE_PERIODS.flatMap((period) => period.times)
