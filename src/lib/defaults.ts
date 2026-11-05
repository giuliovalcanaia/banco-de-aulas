import type { Settings, StoreData } from './types'

export const SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  defaultMorning: { start: '07:15', end: '11:15' },
  defaultAfternoon: { start: '13:00', end: '17:00' },
  minutesPerAula: 48,
  workdays: [1, 2, 3, 4, 5],
}

export function createEmptyData(): StoreData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: DEFAULT_SETTINGS,
    entries: [],
  }
}
