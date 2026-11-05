import { useCallback, useEffect, useState } from 'react'
import {
  applyTheme,
  getInitialTheme,
  saveTheme,
  type Theme,
} from '@/lib/theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((previous) => {
      const next: Theme = previous === 'dark' ? 'light' : 'dark'
      saveTheme(next)
      return next
    })
  }, [])

  return { theme, toggle }
}
