export type Theme = 'light' | 'dark'

/** Mesma convenção de prefixo usada pelos dados em `storage.ts`. */
const THEME_KEY = 'banco-de-aulas:theme'

const THEME_COLOR: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#18181b',
}

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** Tema salvo pelo usuário ou, na primeira visita, o do sistema. */
export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getPreferredTheme()
}

/** Aplica o tema no documento inteiro (classe, controles nativos e barra do navegador). */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[theme])
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Navegador sem localStorage: o tema continua valendo só nesta sessão.
  }
}
