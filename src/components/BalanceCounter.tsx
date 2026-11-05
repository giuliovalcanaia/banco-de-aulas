import { Card, CardContent } from '@/components/ui/card'
import type { Settings } from '@/lib/types'
import {
  defaultDayMinutes,
  formatDaysOff,
  formatDuration,
  formatSignedAulas,
} from '@/lib/time'
import { cn } from '@/lib/utils'

type BalanceCounterProps = {
  totalMinutes: number
  settings: Settings
}

export function BalanceCounter({ totalMinutes, settings }: BalanceCounterProps) {
  const daysOff = formatDaysOff(totalMinutes, defaultDayMinutes(settings))
  const daysLabel = daysOff === '1' ? 'dia' : 'dias'

  const tone =
    totalMinutes > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : totalMinutes < 0
        ? 'text-destructive'
        : 'text-foreground'

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:right-4 sm:bottom-4">
      <Card
        className="pointer-events-auto w-full border-border/80 shadow-lg sm:w-64"
        aria-live="polite"
      >
        <CardContent className="p-4">
          <p className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
            Saldo do banco
          </p>
          <p className={cn('mt-1 text-3xl font-semibold tabular-nums', tone)}>
            {formatSignedAulas(totalMinutes, settings.minutesPerAula)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">aulas</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDuration(totalMinutes)} · ≈ {daysOff} {daysLabel} de folga
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
