import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteEntry as deleteEntryFromDb,
  replaceAll,
  saveSettings,
  subscribeStore,
  upsertEntry as upsertEntryInDb,
} from '@/lib/db'
import { createEmptyData } from '@/lib/defaults'
import { errorMessage } from '@/lib/errors'
import type { EntryInput, Settings, StoreData } from '@/lib/types'

export type { EntryInput } from '@/lib/types'

export type SyncState = 'loading' | 'synced' | 'saving' | 'offline' | 'error'

/**
 * `enabled` só vira true quando o usuário está autenticado. A tela de login não
 * dispara leituras no Firestore.
 */
export function useStore(enabled: boolean, uid: string | null) {
  const [data, setData] = useState<StoreData | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    if (!enabled || !uid) {
      setData(null)
      setSyncState('loading')
      setError(null)
      return
    }

    setError(null)
    setSyncState('loading')

    return subscribeStore(
      uid,
      (next, meta) => {
        setData(next)
        setSyncState(
          meta.pendingWrites ? 'saving' : meta.fromCache ? 'offline' : 'synced',
        )
      },
      (firestoreError) => {
        setError(errorMessage(firestoreError))
        setSyncState('error')
      },
    )
  }, [enabled, uid, reloadVersion])

  const refresh = useCallback(() => {
    setReloadVersion((version) => version + 1)
  }, [])

  const currentUid = useCallback((): string => {
    if (!uid) throw new Error('Você precisa estar autenticado.')
    return uid
  }, [uid])

  const upsertEntry = useCallback(
    async (input: EntryInput) => {
      await upsertEntryInDb(currentUid(), input)
    },
    [currentUid],
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      await deleteEntryFromDb(currentUid(), id)
    },
    [currentUid],
  )

  const updateSettings = useCallback(
    async (settings: Settings) => {
      await saveSettings(currentUid(), settings)
    },
    [currentUid],
  )

  const replaceData = useCallback(
    async (next: StoreData) => {
      await replaceAll(currentUid(), next)
    },
    [currentUid],
  )

  const resetData = useCallback(async () => {
    await replaceAll(currentUid(), createEmptyData())
  }, [currentUid])

  const entriesByDate = useMemo(
    () => new Map((data?.entries ?? []).map((entry) => [entry.date, entry])),
    [data?.entries],
  )

  return {
    data,
    entriesByDate,
    loading: data === null && syncState === 'loading',
    syncState,
    error,
    refresh,
    upsertEntry,
    deleteEntry,
    updateSettings,
    replaceData,
    resetData,
  }
}
