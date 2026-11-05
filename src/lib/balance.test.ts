import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './defaults'
import { balanceForDay, totalDeltaMinutes } from './balance'
import { AFTERNOON_BREAK, MORNING_BREAK } from './schedule'
import {
  dayMinutes,
  defaultDayMinutes,
  formatDuration,
  formatSignedAulas,
  rangeMinutes,
  timeToMinutes,
} from './time'
import type { DayEntry } from './types'

function makeEntry(overrides: Partial<DayEntry> = {}): DayEntry {
  return {
    id: 'entry-1',
    date: '2026-11-05',
    morning: { start: '07:15', end: '11:15' },
    afternoon: { start: '13:00', end: '17:00' },
    note: '',
    updatedAt: '2026-11-05T12:00:00.000Z',
    ...overrides,
  }
}

describe('time', () => {
  it('converte horário em minutos', () => {
    expect(timeToMinutes('07:15')).toBe(435)
    expect(timeToMinutes('17:00')).toBe(1020)
    expect(timeToMinutes('25:00')).toBeNull()
    expect(timeToMinutes('07:60')).toBeNull()
  })

  it('calcula intervalos e ignora intervalos invertidos', () => {
    expect(rangeMinutes({ start: '07:15', end: '11:15' })).toBe(240)
    expect(rangeMinutes({ start: '07:15', end: '11:15' }, MORNING_BREAK)).toBe(225)
    expect(rangeMinutes({ start: '07:15', end: '09:30' }, MORNING_BREAK)).toBe(135)
    expect(rangeMinutes({ start: '09:30', end: '09:45' }, MORNING_BREAK)).toBe(0)
    expect(rangeMinutes({ start: '13:00', end: '17:00' }, AFTERNOON_BREAK)).toBe(225)
    expect(rangeMinutes({ start: '11:15', end: '07:15' })).toBe(0)
    expect(rangeMinutes(null)).toBe(0)
  })

  it('calcula a jornada padrão como 450 minutos, sem os lanches', () => {
    expect(defaultDayMinutes(DEFAULT_SETTINGS)).toBe(450)
    expect(
      dayMinutes({
        morning: { start: '07:15', end: '11:15' },
        afternoon: { start: '13:00', end: '17:00' },
      }),
    ).toBe(450)
  })

  it('formata duração', () => {
    expect(formatDuration(90)).toBe('1h30')
    expect(formatDuration(450)).toBe('7h30')
    expect(formatDuration(480)).toBe('8h00')
    expect(formatDuration(-45)).toBe('-45min')
    expect(formatDuration(0)).toBe('0h')
  })

  it('formata aulas com sinal', () => {
    expect(formatSignedAulas(45, 45)).toBe('+1')
    expect(formatSignedAulas(90, 45)).toBe('+2')
    expect(formatSignedAulas(-450, 45)).toBe('-10')
    expect(formatSignedAulas(0, 45)).toBe('0')
  })
})

describe('balance', () => {
  it('dia padrão tem saldo zero', () => {
    expect(balanceForDay(makeEntry(), DEFAULT_SETTINGS).deltaMinutes).toBe(0)
  })

  it('saída ao meio-dia soma 45 minutos', () => {
    const day = makeEntry({ morning: { start: '07:15', end: '12:00' } })
    expect(balanceForDay(day, DEFAULT_SETTINGS).deltaMinutes).toBe(45)
  })

  it('saída às 17:45 soma 90 minutos', () => {
    const day = makeEntry({
      morning: { start: '07:15', end: '12:00' },
      afternoon: { start: '13:00', end: '17:45' },
    })
    expect(balanceForDay(day, DEFAULT_SETTINGS).deltaMinutes).toBe(90)
  })

  it('saída logo após o recreio desconta o lanche e vale 2 aulas', () => {
    const day = makeEntry({ morning: { start: '07:15', end: '09:30' } })
    const balance = balanceForDay(day, DEFAULT_SETTINGS)
    expect(balance.deltaMinutes).toBe(-90)
    expect(balance.deltaAulas).toBe(-2)
  })

  it('folga desconta uma jornada inteira', () => {
    const day = makeEntry({ morning: null, afternoon: null })
    const balance = balanceForDay(day, DEFAULT_SETTINGS)
    expect(balance.deltaMinutes).toBe(-450)
    expect(balance.deltaAulas).toBe(-10)
  })

  it('total soma apenas os lançamentos', () => {
    const entries = [
      makeEntry(),
      makeEntry({
        id: 'entry-2',
        morning: { start: '07:15', end: '12:00' },
      }),
    ]
    expect(totalDeltaMinutes(entries, DEFAULT_SETTINGS)).toBe(45)
  })
})
