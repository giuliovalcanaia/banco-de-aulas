import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createEmptyData } from '@/lib/defaults'
import { newId } from '@/lib/id'
import { sheetsApi } from '@/lib/sheets'
import type { SheetsConfig } from '@/lib/sheetsConfig'
import {
  loadCache,
  loadLegacyData,
  markMigrated,
  saveCache,
  wasMigrated,
} from '@/lib/storage'
import type { DayEntry, Settings, StoreData } from '@/lib/types'

export type EntryInput = Omit<DayEntry, 'id' | 'updatedAt'> & { id?: string }

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Não foi possível falar com a planilha.'
}

export function useStore(config: SheetsConfig | null) {
  const [data, setData] = useState<StoreData | null>(() => loadCache())
  const [loading, setLoading] = useState(Boolean(config))
  const [error, setError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const dataRef = useRef<StoreData | null>(data)

  const apply = useCallback((next: StoreData | null) => {
    dataRef.current = next
    setData(next)
    if (next) saveCache(next)
  }, [])

  const currentData = useCallback((): StoreData => {
    const current = dataRef.current
    if (!current) throw new Error('Os dados ainda não foram carregados.')
    return current
  }, [])

  const currentConfig = useCallback((): SheetsConfig => {
    if (!config) throw new Error('A planilha não está configurada.')
    return config
  }, [config])

  useEffect(() => {
    if (!config) {
      setLoading(false)
      apply(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        let remote = await sheetsApi.load(config)
        if (cancelled) return

        if (remote.entries.length === 0 && !wasMigrated()) {
          const legacy = loadLegacyData()
          if (legacy) {
            remote = await sheetsApi.replaceAll(config, legacy)
            markMigrated()
            if (!cancelled) {
              toast.success('Dados deste navegador foram enviados para a planilha.')
            }
          } else {
            markMigrated()
          }
        }

        if (!cancelled) apply(remote)
      } catch (loadError) {
        if (!cancelled) setError(errorMessage(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [config, reloadVersion, apply])

  const refresh = useCallback(() => {
    setReloadVersion((version) => version + 1)
  }, [])

  const upsertEntry = useCallback(
    async (input: EntryInput) => {
      const previous = currentData()
      const existingByDate = previous.entries.find(
        (entry) => entry.date === input.date,
      )
      const id = input.id ?? existingByDate?.id ?? newId()
      const entry: DayEntry = {
        ...input,
        id,
        updatedAt: new Date().toISOString(),
      }

      const entries = [
        ...previous.entries.filter(
          (item) => item.id !== id && item.date !== input.date,
        ),
        entry,
      ]

      apply({ ...previous, entries })

      try {
        const saved = await sheetsApi.upsertEntry(currentConfig(), entry)
        const current = dataRef.current
        if (!current) return

        const nextEntries = [
          ...current.entries.filter(
            (item) => item.id !== saved.id && item.date !== saved.date,
          ),
          saved,
        ]

        apply({ ...current, entries: nextEntries })
      } catch (saveError) {
        apply(previous)
        throw saveError
      }
    },
    [apply, currentConfig, currentData],
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      const previous = currentData()
      apply({
        ...previous,
        entries: previous.entries.filter((entry) => entry.id !== id),
      })

      try {
        await sheetsApi.deleteEntry(currentConfig(), id)
      } catch (deleteError) {
        apply(previous)
        throw deleteError
      }
    },
    [apply, currentConfig, currentData],
  )

  const updateSettings = useCallback(
    async (settings: Settings) => {
      const previous = currentData()
      apply({ ...previous, settings })

      try {
        const saved = await sheetsApi.saveSettings(currentConfig(), settings)
        const current = dataRef.current
        if (current) apply({ ...current, settings: saved })
      } catch (saveError) {
        apply(previous)
        throw saveError
      }
    },
    [apply, currentConfig, currentData],
  )

  const replaceData = useCallback(
    async (next: StoreData) => {
      const previous = dataRef.current
      try {
        const saved = await sheetsApi.replaceAll(currentConfig(), next)
        apply(saved)
      } catch (replaceError) {
        if (previous) apply(previous)
        throw replaceError
      }
    },
    [apply, currentConfig],
  )

  const resetData = useCallback(async () => {
    await replaceData(createEmptyData())
  }, [replaceData])

  const entriesByDate = useMemo(
    () => new Map((data?.entries ?? []).map((entry) => [entry.date, entry])),
    [data?.entries],
  )

  return {
    data,
    entriesByDate,
    loading,
    error,
    refresh,
    upsertEntry,
    deleteEntry,
    updateSettings,
    replaceData,
    resetData,
  }
}
