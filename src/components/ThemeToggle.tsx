import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Theme } from '@/lib/theme'

type ThemeToggleProps = {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'
  const label = isDark ? 'Ativar tema claro' : 'Ativar tema escuro'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-10 sm:size-8"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
