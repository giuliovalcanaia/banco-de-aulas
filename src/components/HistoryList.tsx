import { useMemo, useState } from 'react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { balanceForDay } from '@/lib/balance'
import { formatDateShort, formatMonth } from '@/lib/date'
import { formatDuration, formatSignedAulas } from '@/lib/time'
import type { DayEntry, Settings } from '@/lib/types'
import { cn } from '@/lib/utils'

type HistoryListProps = {
  entries: DayEntry[]
  settings: Settings
  onEdit: (entry: DayEntry) => void
  onDelete: (entry: DayEntry) => void
}

function periodsLabel(entry: DayEntry): string {
  const parts: string[] = []
  if (entry.morning) parts.push(`${entry.morning.start}–${entry.morning.end}`)
  if (entry.afternoon) parts.push(`${entry.afternoon.start}–${entry.afternoon.end}`)
  return parts.length > 0 ? parts.join(' · ') : 'Folga'
}

function toneText(minutes: number): string {
  if (minutes > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (minutes < 0) return 'text-destructive'
  return 'text-muted-foreground'
}

function toneBadge(minutes: number): string {
  if (minutes > 0) {
    return 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
  }
  if (minutes < 0) {
    return 'border-destructive/30 bg-destructive/10 text-destructive'
  }
  return 'text-muted-foreground'
}

export function HistoryList({
  entries,
  settings,
  onEdit,
  onDelete,
}: HistoryListProps) {
  const [pendingDelete, setPendingDelete] = useState<DayEntry | null>(null)

  const groups = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    const map = new Map<string, DayEntry[]>()

    for (const entry of sorted) {
      const key = entry.date.slice(0, 7)
      const list = map.get(key)
      if (list) {
        list.push(entry)
      } else {
        map.set(key, [entry])
      }
    }

    return [...map.entries()]
  }, [entries])

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium">Nenhum dia divergente lançado.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando você trabalhar fora do horário padrão ou tirar folga, o
            registro aparece aqui.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map(([key, monthEntries]) => {
        const subtotal = monthEntries.reduce(
          (sum, entry) => sum + balanceForDay(entry, settings).deltaMinutes,
          0,
        )

        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base capitalize">
                  {formatMonth(key)}
                </CardTitle>
                <Badge variant="outline" className={cn('tabular-nums', toneBadge(subtotal))}>
                  {formatSignedAulas(subtotal, settings.minutesPerAula)} aulas
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y">
                {monthEntries.map((entry) => {
                  const balance = balanceForDay(entry, settings)

                  return (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize">
                          {formatDateShort(entry.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {periodsLabel(entry)}
                        </p>
                        {entry.note && (
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            {entry.note}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            toneText(balance.deltaMinutes),
                          )}
                        >
                          {formatSignedAulas(
                            balance.deltaMinutes,
                            settings.minutesPerAula,
                          )}{' '}
                          aulas
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(balance.deltaMinutes)}
                        </p>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onEdit(entry)}
                          aria-label={`Editar ${entry.date}`}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setPendingDelete(entry)}
                          aria-label={`Excluir ${entry.date}`}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O dia{' '}
              {pendingDelete ? formatDateShort(pendingDelete.date) : ''} volta a
              valer como jornada padrão, com saldo zero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete)
                setPendingDelete(null)
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
