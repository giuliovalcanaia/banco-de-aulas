import { Card, CardContent } from '@/components/ui/card'
import type { Settings } from '@/lib/types'
import {
  defaultDayMinutes,
  formatDaysOff,
  formatDuration,
  formatSignedAulas,
} from '@/lib/time'
import { cn } from '@/lib/utils'

type BalanceProps = {
  totalMinutes: number
  settings: Settings
}

function toneText(minutes: number): string {
  if (minutes > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (minutes < 0) return 'text-destructive'
  return 'text-foreground'
}

/** Saldo compacto para o cabeçalho no celular. */
export function BalancePill({
  totalMinutes,
  settings,
  className,
}: BalanceProps & { className?: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-2.5 py-1',
        className,
      )}
      role="status"
      aria-label={`Saldo de ${formatSignedAulas(totalMinutes, settings.minutesPerAula)} aulas`}
      title={`${formatDuration(totalMinutes)} · ${formatDaysOff(totalMinutes, defaultDayMinutes(settings))} dias de folga`}
    >
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          toneText(totalMinutes),
        )}
      >
        {formatSignedAulas(totalMinutes, settings.minutesPerAula)}
      </span>
      <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground max-[359px]:hidden">
        aulas
      </span>
    </div>
  )
}

export function BalanceCounter({ totalMinutes, settings }: BalanceProps) {
  const daysOff = formatDaysOff(totalMinutes, defaultDayMinutes(settings))
  const daysLabel = daysOff === '1' ? 'dia' : 'dias'

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-40 hidden sm:inset-x-auto sm:right-4 sm:bottom-4 sm:block sm:w-64">
      <Card
        className="pointer-events-auto w-full border-border/80 shadow-lg"
        aria-live="polite"
      >
        <CardContent className="p-4">
          <p className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
            Saldo do banco
          </p>
          <p
            className={cn(
              'mt-1 text-3xl font-semibold tabular-nums',
              toneText(totalMinutes),
            )}
          >
            {formatSignedAulas(totalMinutes, settings.minutesPerAula)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              aulas
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDuration(totalMinutes)} · ≈ {daysOff} {daysLabel} de folga
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
