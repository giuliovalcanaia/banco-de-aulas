const CONFIG_KEY = 'banco-de-aulas:sheets-config'

export type SheetsConfig = {
  url: string
  token: string
}

function normalizeConfig(url: unknown, token: unknown): SheetsConfig | null {
  if (typeof url !== 'string' || typeof token !== 'string') return null
  const cleanUrl = url.trim()
  const cleanToken = token.trim()
  if (!cleanUrl || !cleanToken) return null
  return { url: cleanUrl, token: cleanToken }
}

function envConfig(): SheetsConfig | null {
  return normalizeConfig(
    import.meta.env.VITE_SHEETS_API_URL,
    import.meta.env.VITE_SHEETS_TOKEN,
  )
}

export function hasEnvConfig(): boolean {
  return envConfig() !== null
}

/** Lê a conexão das variáveis de ambiente ou do que foi salvo neste navegador. */
export function getSheetsConfig(): SheetsConfig | null {
  const fromEnv = envConfig()
  if (fromEnv) return fromEnv

  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { url?: unknown; token?: unknown }
    return normalizeConfig(parsed.url, parsed.token)
  } catch {
    return null
  }
}

export function saveSheetsConfig(config: SheetsConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function clearSheetsConfig(): void {
  localStorage.removeItem(CONFIG_KEY)
}
