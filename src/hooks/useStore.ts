import { useCallback, useEffect, useMemo, useState } from 'react'
import { createEmptyData } from '@/lib/defaults'
import { newId } from '@/lib/id'
import { loadData, saveData } from '@/lib/storage'
import type { DayEntry, Settings, StoreData } from '@/lib/types'

export type EntryInput = Omit<DayEntry, 'id' | 'updatedAt'>

export function useStore() {
  const [data, setData] = useState<StoreData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const entriesByDate = useMemo(
    () => new Map(data.entries.map((entry) => [entry.date, entry])),
    [data.entries],
  )

  const upsertEntry = useCallback((input: EntryInput) => {
    setData((previous) => {
      const existing = previous.entries.find((entry) => entry.date === input.date)
      const entry: DayEntry = {
        ...input,
        id: existing?.id ?? newId(),
        updatedAt: new Date().toISOString(),
      }
      const entries = existing
        ? previous.entries.map((item) => (item.id === existing.id ? entry : item))
        : [...previous.entries, entry]
      return { ...previous, entries }
    })
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setData((previous) => ({
      ...previous,
      entries: previous.entries.filter((entry) => entry.id !== id),
    }))
  }, [])

  const updateSettings = useCallback((settings: Settings) => {
    setData((previous) => ({ ...previous, settings }))
  }, [])

  const replaceData = useCallback((next: StoreData) => {
    setData(next)
  }, [])

  const resetData = useCallback(() => {
    setData(createEmptyData())
  }, [])

  return {
    data,
    entriesByDate,
    upsertEntry,
    deleteEntry,
    updateSettings,
    replaceData,
    resetData,
  }
}
