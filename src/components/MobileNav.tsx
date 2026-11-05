import { HistoryIcon, PenLineIcon, Settings2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabValue = 'hoje' | 'historico' | 'ajustes'

const ITEMS: { value: TabValue; label: string; icon: typeof PenLineIcon }[] = [
  { value: 'hoje', label: 'Hoje', icon: PenLineIcon },
  { value: 'historico', label: 'Histórico', icon: HistoryIcon },
  { value: 'ajustes', label: 'Ajustes', icon: Settings2Icon },
]

type MobileNavProps = {
  value: TabValue
  onChange: (value: TabValue) => void
}

export function MobileNav({ value, onChange }: MobileNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div className="grid grid-cols-3">
        {ITEMS.map((item) => {
          const active = value === item.value
          const Icon = item.icon

          return (
            <button
              key={item.value}
              type="button"
              data-tab={item.value}
              onClick={() => onChange(item.value)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-14 touch-manipulation flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors',
                active
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
