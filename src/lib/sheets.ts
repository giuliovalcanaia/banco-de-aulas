import { parseStoreData } from './storage'
import type { SheetsConfig } from './sheetsConfig'
import type { DayEntry, Settings, StoreData } from './types'

type ApiResult = {
  ok: boolean
  data?: unknown
  error?: string
}

const REQUEST_TIMEOUT_MS = 30_000

async function request<T>(
  config: SheetsConfig,
  action: string,
  payload: unknown = {},
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      // text/plain evita o preflight de CORS no Apps Script.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: config.token, action, payload }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`A planilha respondeu com erro ${response.status}.`)
    }

    const text = await response.text()
    let result: ApiResult
    try {
      result = JSON.parse(text) as ApiResult
    } catch {
      throw new Error(
        'A planilha respondeu em um formato inesperado. Confira se o Web App está publicado para "qualquer pessoa".',
      )
    }

    if (!result || result.ok !== true) {
      throw new Error(result?.error || 'Erro desconhecido na planilha.')
    }

    return result.data as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('A planilha demorou demais para responder. Tente de novo.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export const sheetsApi = {
  async load(config: SheetsConfig): Promise<StoreData> {
    return parseStoreData(await request<unknown>(config, 'load'))
  },

  async upsertEntry(
    config: SheetsConfig,
    entry: DayEntry,
  ): Promise<DayEntry> {
    return request<DayEntry>(config, 'upsertEntry', { entry })
  },

  async deleteEntry(config: SheetsConfig, id: string): Promise<void> {
    await request<{ deleted: boolean }>(config, 'deleteEntry', { id })
  },

  async saveSettings(
    config: SheetsConfig,
    settings: Settings,
  ): Promise<Settings> {
    return request<Settings>(config, 'saveSettings', { settings })
  },

  async replaceAll(config: SheetsConfig, data: StoreData): Promise<StoreData> {
    return parseStoreData(await request<unknown>(config, 'replaceAll', { data }))
  },
}
