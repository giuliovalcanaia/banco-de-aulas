import { DEFAULT_SETTINGS, SCHEMA_VERSION } from './defaults'
import { todayISO } from './date'
import { newId } from './id'
import type { DayEntry, Settings, StoreData, TimeRange } from './types'
import { isValidTime } from './time'

/** Chave antiga, usada apenas na migração única para a planilha. */
const LEGACY_KEY = 'banco-de-aulas:data'
const CACHE_KEY = 'banco-de-aulas:cache'
const MIGRATION_KEY = 'banco-de-aulas:migrated-to-sheets'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRange(value: unknown): TimeRange | null {
  if (!isRecord(value)) return null
  const { start, end } = value
  if (typeof start !== 'string' || typeof end !== 'string') return null
  if (!isValidTime(start) || !isValidTime(end)) return null
  return { start, end }
}

function parseSettings(value: unknown): Settings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS }

  const minutesPerAula =
    typeof value.minutesPerAula === 'number' &&
    Number.isFinite(value.minutesPerAula) &&
    value.minutesPerAula > 0
      ? value.minutesPerAula
      : DEFAULT_SETTINGS.minutesPerAula

  const workdays = Array.isArray(value.workdays)
    ? value.workdays.filter(
        (day): day is number => typeof day === 'number' && day >= 0 && day <= 6,
      )
    : DEFAULT_SETTINGS.workdays

  return {
    defaultMorning: parseRange(value.defaultMorning) ?? DEFAULT_SETTINGS.defaultMorning,
    defaultAfternoon: parseRange(value.defaultAfternoon) ?? DEFAULT_SETTINGS.defaultAfternoon,
    minutesPerAula,
    workdays: workdays.length > 0 ? workdays : DEFAULT_SETTINGS.workdays,
  }
}

function parseEntry(value: unknown): DayEntry | null {
  if (!isRecord(value)) return null
  if (typeof value.date !== 'string' || !DATE_PATTERN.test(value.date)) return null

  const morning = value.morning === null ? null : parseRange(value.morning)
  const afternoon = value.afternoon === null ? null : parseRange(value.afternoon)
  if (value.morning !== null && morning === null) return null
  if (value.afternoon !== null && afternoon === null) return null

  return {
    id: typeof value.id === 'string' && value.id ? value.id : newId(),
    date: value.date,
    morning,
    afternoon,
    note: typeof value.note === 'string' ? value.note : '',
    updatedAt:
      typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  }
}

/** Valida e normaliza um objeto vindo do localStorage ou de um arquivo. */
export function parseStoreData(value: unknown): StoreData {
  if (!isRecord(value)) {
    throw new Error('Arquivo inválido: esperado um objeto JSON.')
  }
  if (!Array.isArray(value.entries)) {
    throw new Error('Arquivo inválido: lista de lançamentos ausente.')
  }

  const entries = value.entries.map((item, index) => {
    const entry = parseEntry(item)
    if (!entry) {
      throw new Error(`Lançamento ${index + 1} inválido no arquivo.`)
    }
    return entry
  })

  const uniqueByDate = new Map(entries.map((entry) => [entry.date, entry]))

  return {
    schemaVersion:
      typeof value.schemaVersion === 'number' ? value.schemaVersion : SCHEMA_VERSION,
    settings: parseSettings(value.settings),
    entries: [...uniqueByDate.values()],
  }
}

/** Lê os dados antigos do localStorage. Retorna null se não houver nada. */
export function loadLegacyData(): StoreData | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    return parseStoreData(JSON.parse(raw))
  } catch (error) {
    console.error('Não foi possível ler os dados antigos.', error)
    return null
  }
}

export function wasMigrated(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(MIGRATION_KEY) === '1'
}

export function markMigrated(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MIGRATION_KEY, '1')
}

/** Cache de leitura para pintar a tela antes da planilha responder. */
export function loadCache(): StoreData | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return parseStoreData(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveCache(data: StoreData): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Não foi possível salvar o cache local.', error)
  }
}

export function clearCache(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
}

export function exportData(data: StoreData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `banco-de-aulas-${todayISO()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function readImportFile(file: File): Promise<StoreData> {
  const text = await file.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('O arquivo não é um JSON válido.')
  }

  return parseStoreData(parsed)
}
