const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Data local no formato YYYY-MM-DD (evita o deslocamento de fuso do toISOString). */
export function todayISO(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Interpreta a data como local, ao meio-dia, para não cair no dia anterior. */
export function parseISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

export function isValidISODate(iso: string): boolean {
  return DATE_PATTERN.test(iso) && !Number.isNaN(parseISODate(iso).getTime())
}

export function formatDateShort(iso: string): string {
  if (!isValidISODate(iso)) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(parseISODate(iso))
}

export function formatDateLong(iso: string): string {
  if (!isValidISODate(iso)) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseISODate(iso))
}

export function formatMonth(key: string): string {
  if (!isValidISODate(`${key}-01`)) return key
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(parseISODate(`${key}-01`))
}

export function weekdayOf(iso: string): number {
  return parseISODate(iso).getDay()
}
