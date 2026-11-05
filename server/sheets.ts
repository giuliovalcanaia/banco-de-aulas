import { requireEnv } from './env'

export const ALLOWED_ACTIONS = new Set([
  'load',
  'upsertEntry',
  'deleteEntry',
  'saveSettings',
  'replaceAll',
])

export function isAllowedAction(action: unknown): action is string {
  return typeof action === 'string' && ALLOWED_ACTIONS.has(action)
}

type SheetsResponse = {
  ok?: boolean
  data?: unknown
  error?: string
}

/**
 * Encaminha a ação para o Web App do Apps Script usando as credenciais que só
 * existem no servidor. O navegador nunca vê a URL nem o token da planilha.
 */
export async function callSheets(
  action: string,
  payload: unknown,
): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)

  try {
    const response = await fetch(requireEnv('SHEETS_API_URL'), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        token: requireEnv('SHEETS_TOKEN'),
        action,
        payload: payload ?? {},
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`A planilha respondeu com erro ${response.status}.`)
    }

    let result: SheetsResponse
    try {
      result = (await response.json()) as SheetsResponse
    } catch {
      throw new Error(
        'A planilha respondeu em um formato inesperado. Confira se o Web App continua publicado.',
      )
    }

    if (!result || result.ok !== true) {
      throw new Error(result?.error || 'Erro desconhecido na planilha.')
    }

    return result.data
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('A planilha demorou demais para responder. Tente de novo.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
