import {
  clearIndexedDbPersistence,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  terminate,
  writeBatch,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type WriteBatch,
} from 'firebase/firestore'
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from './defaults'
import { db } from './firebase'
import { parseRange, parseSettings } from './storage'
import type { DayEntry, EntryInput, Settings, StoreData } from './types'

export type SyncMeta = {
  fromCache: boolean
  pendingWrites: boolean
}

function timestampToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString()

  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: unknown }).toDate
    if (typeof toDate === 'function') {
      const date = (toDate as () => Date).call(value)
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString()
      }
    }
  }

  if (typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }

  return new Date().toISOString()
}

export function docToEntry(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DayEntry {
  const data = snapshot.data({ serverTimestamps: 'estimate' })

  return {
    id: snapshot.id,
    date: snapshot.id,
    morning: parseRange(data.morning),
    afternoon: parseRange(data.afternoon),
    note: typeof data.note === 'string' ? data.note : '',
    updatedAt: timestampToIso(data.updatedAt),
  }
}

function defaultSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    defaultMorning: { ...DEFAULT_SETTINGS.defaultMorning },
    defaultAfternoon: { ...DEFAULT_SETTINGS.defaultAfternoon },
    workdays: [...DEFAULT_SETTINGS.workdays],
  }
}

function entriesCollection(uid: string) {
  return collection(db, 'users', uid, 'entries')
}

function entryDocument(uid: string, date: string) {
  return doc(db, 'users', uid, 'entries', date)
}

function settingsDocument(uid: string) {
  return doc(db, 'users', uid, 'settings', 'main')
}

function entryToDoc(input: EntryInput) {
  return {
    date: input.date,
    morning: input.morning,
    afternoon: input.afternoon,
    note: input.note,
    updatedAt: serverTimestamp(),
  }
}

function settingsToDoc(settings: Settings) {
  return {
    ...settings,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: serverTimestamp(),
  }
}

/**
 * Assina entries + settings. Só entrega o primeiro estado quando as duas
 * leituras chegaram, para não renderizar ajustes padrão por engano.
 */
export function subscribeStore(
  uid: string,
  onData: (data: StoreData, meta: SyncMeta) => void,
  onError: (error: FirestoreError) => void,
): () => void {
  let entries: DayEntry[] | null = null
  let settings: Settings | null = null
  let entriesMeta: SyncMeta = { fromCache: true, pendingWrites: false }
  let settingsMeta: SyncMeta = { fromCache: true, pendingWrites: false }

  const emit = () => {
    if (entries === null || settings === null) return

    onData(
      {
        schemaVersion: SCHEMA_VERSION,
        settings,
        entries,
      },
      {
        fromCache: entriesMeta.fromCache || settingsMeta.fromCache,
        pendingWrites:
          entriesMeta.pendingWrites || settingsMeta.pendingWrites,
      },
    )
  }

  const unsubscribeEntries = onSnapshot(
    entriesCollection(uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      entries = snapshot.docs.map(docToEntry)
      entriesMeta = {
        fromCache: snapshot.metadata.fromCache,
        pendingWrites: snapshot.metadata.hasPendingWrites,
      }
      emit()
    },
    onError,
  )

  const unsubscribeSettings = onSnapshot(
    settingsDocument(uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      settings = snapshot.exists()
        ? parseSettings(snapshot.data())
        : defaultSettings()
      settingsMeta = {
        fromCache: snapshot.metadata.fromCache,
        pendingWrites: snapshot.metadata.hasPendingWrites,
      }
      emit()
    },
    onError,
  )

  return () => {
    unsubscribeEntries()
    unsubscribeSettings()
  }
}

export async function upsertEntry(
  uid: string,
  input: EntryInput,
): Promise<void> {
  const batch = writeBatch(db)

  batch.set(entryDocument(uid, input.date), entryToDoc(input))

  // O id antigo é a data de origem quando o usuário muda a data no formulário.
  if (input.id && input.id !== input.date) {
    batch.delete(entryDocument(uid, input.id))
  }

  await batch.commit()
}

export async function deleteEntry(uid: string, id: string): Promise<void> {
  await deleteDoc(entryDocument(uid, id))
}

export async function saveSettings(
  uid: string,
  settings: Settings,
): Promise<void> {
  await setDoc(settingsDocument(uid), settingsToDoc(settings))
}

type BatchOperation = (batch: WriteBatch) => void

function commitInChunks(operations: BatchOperation[]): Promise<void> {
  const chunks: BatchOperation[][] = []
  for (let index = 0; index < operations.length; index += 400) {
    chunks.push(operations.slice(index, index + 400))
  }

  return chunks.reduce<Promise<void>>(
    (previous, chunk) =>
      previous.then(async () => {
        const batch = writeBatch(db)
        chunk.forEach((operation) => operation(batch))
        await batch.commit()
      }),
    Promise.resolve(),
  )
}

/**
 * Substitui todos os dados do usuário. Usado por Importar JSON e Apagar tudo.
 * Precisa de rede porque lê os documentos atuais antes de montar o batch.
 */
export async function replaceAll(
  uid: string,
  data: StoreData,
): Promise<void> {
  const existing = await getDocs(entriesCollection(uid))
  const entriesByDate = new Map(
    data.entries.map((entry) => [entry.date, entry]),
  )

  const operations: BatchOperation[] = []

  for (const snapshot of existing.docs) {
    if (!entriesByDate.has(snapshot.id)) {
      operations.push((batch) => batch.delete(snapshot.ref))
    }
  }

  for (const entry of entriesByDate.values()) {
    operations.push((batch) =>
      batch.set(entryDocument(uid, entry.date), entryToDoc(entry)),
    )
  }

  await commitInChunks(operations)
  await setDoc(settingsDocument(uid), settingsToDoc(data.settings))
}

/** Remove o cache local do Firestore. Deve ser seguido de reload da página. */
export async function clearLocalPersistence(): Promise<void> {
  try {
    await terminate(db)
    await clearIndexedDbPersistence(db)
  } catch (error) {
    console.warn('Não foi possível limpar o cache local do Firestore.', error)
  }
}
