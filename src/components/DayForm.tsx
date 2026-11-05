import { useEffect, useState, type FormEvent } from 'react'
import { PencilIcon, Trash2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DateField } from '@/components/DateField'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { TimeSelect } from '@/components/TimeSelect'
import type { DayEntry, EntryInput, Settings, TimeRange } from '@/lib/types'
import { formatDateLong, isValidISODate, todayISO } from '@/lib/date'
import { errorMessage } from '@/lib/errors'
import { AFTERNOON_BREAK, MORNING_BREAK } from '@/lib/schedule'
import {
  dayMinutes,
  defaultDayMinutes,
  formatDuration,
  formatSignedAulas,
  isValidTime,
  rangeMinutes,
  timeToMinutes,
} from '@/lib/time'
import { cn } from '@/lib/utils'

type DayFormProps = {
  settings: Settings
  entriesByDate: Map<string, DayEntry>
  initialDate: string
  editingEntryId?: string | null
  onFinishEdit?: (date?: string) => void
  onCancelEdit?: (date?: string) => void
  onSave: (input: EntryInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

type PeriodEditorProps = {
  label: string
  value: TimeRange | null
  fallback: TimeRange
  onChange: (value: TimeRange | null) => void
}

function PeriodEditor({ label, value, fallback, onChange }: PeriodEditorProps) {
  if (!value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2.5">
        <span className="text-sm text-muted-foreground">{label} · não trabalhei</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 px-3 sm:h-7 sm:px-2.5"
          onClick={() => onChange(fallback)}
        >
          Adicionar
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-9 sm:size-7"
          onClick={() => onChange(null)}
          aria-label={`Remover ${label}`}
        >
          <XIcon />
        </Button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:items-center">
        <TimeSelect
          value={value.start}
          onChange={(start) => onChange({ ...value, start })}
          ariaLabel={`${label}: início`}
          className="w-full sm:w-[7.5rem]"
        />
        <span className="text-sm text-muted-foreground">até</span>
        <TimeSelect
          value={value.end}
          onChange={(end) => onChange({ ...value, end })}
          ariaLabel={`${label}: fim`}
          className="w-full sm:w-[7.5rem]"
        />
      </div>
    </div>
  )
}

function validatePeriod(
  label: string,
  range: TimeRange | null,
  breakWindow: TimeRange,
): string | null {
  if (!range) return null
  if (!isValidTime(range.start) || !isValidTime(range.end)) {
    return `Informe horários válidos no período da ${label}.`
  }
  const start = timeToMinutes(range.start)
  const end = timeToMinutes(range.end)
  if (start === null || end === null || end <= start) {
    return `No período da ${label}, o fim deve ser depois do início.`
  }
  if (rangeMinutes(range, breakWindow) === 0) {
    return `No período da ${label}, escolha um horário fora do lanche.`
  }
  return null
}

export function DayForm({
  settings,
  entriesByDate,
  initialDate,
  editingEntryId,
  onFinishEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: DayFormProps) {
  const [date, setDate] = useState(initialDate)
  const [morning, setMorning] = useState<TimeRange | null>(settings.defaultMorning)
  const [afternoon, setAfternoon] = useState<TimeRange | null>(
    settings.defaultAfternoon,
  )
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const editingEntry = editingEntryId
    ? ([...entriesByDate.values()].find(
        (entry) => entry.id === editingEntryId,
      ) ?? null)
    : null
  const existing = editingEntry ?? entriesByDate.get(date)

  useEffect(() => {
    if (editingEntryId) return
    setDate(initialDate)
  }, [initialDate, editingEntryId])

  useEffect(() => {
    if (!editingEntryId) return

    const entry = [...entriesByDate.values()].find(
      (item) => item.id === editingEntryId,
    )
    if (!entry) return

    setDate(entry.date)
    setMorning(entry.morning)
    setAfternoon(entry.afternoon)
    setNote(entry.note)
  }, [editingEntryId, entriesByDate])

  useEffect(() => {
    if (editingEntryId) return

    const entry = entriesByDate.get(date)
    if (entry) {
      setMorning(entry.morning)
      setAfternoon(entry.afternoon)
      setNote(entry.note)
    } else {
      setMorning(settings.defaultMorning)
      setAfternoon(settings.defaultAfternoon)
      setNote('')
    }
  }, [
    date,
    entriesByDate,
    settings.defaultMorning,
    settings.defaultAfternoon,
    editingEntryId,
  ])

  const minutes = dayMinutes({ morning, afternoon })
  const delta = minutes - defaultDayMinutes(settings)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValidISODate(date)) {
      toast.error('Escolha uma data válida.')
      return
    }

    const error =
      validatePeriod('manhã', morning, MORNING_BREAK) ??
      validatePeriod('tarde', afternoon, AFTERNOON_BREAK)
    if (error) {
      toast.error(error)
      return
    }

    if (editingEntryId && editingEntry && date !== editingEntry.date) {
      const conflict = entriesByDate.get(date)
      if (conflict && conflict.id !== editingEntryId) {
        toast.error(`Já existe um lançamento em ${formatDateLong(date)}.`)
        return
      }
    }

    setSaving(true)
    try {
      await onSave({
        id: editingEntryId ?? undefined,
        date,
        morning,
        afternoon,
        note: note.trim(),
      })
      toast.success(existing ? 'Dia atualizado.' : 'Dia salvo.')
      onFinishEdit?.(date)
    } catch (saveError) {
      toast.error(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const deltaTone =
    delta > 0
      ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
      : delta < 0
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : 'text-muted-foreground'

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Registro do dia</CardTitle>
          <CardDescription>
            Só lance os dias diferentes da jornada padrão. Dia sem registro vale
            zero.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[10rem_auto] sm:justify-start">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="day-date">Dia</Label>
              <DateField id="day-date" value={date} onChange={setDate} />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-8"
              onClick={() => {
                const today = todayISO()
                onCancelEdit?.(today)
                setDate(today)
              }}
            >
              Hoje
            </Button>
          </div>
          <p className="-mt-2 text-sm first-letter:uppercase text-muted-foreground">
            {formatDateLong(date)}
          </p>

          {editingEntryId && (
            <div className="flex flex-wrap items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <PencilIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                Editando o lançamento de{' '}
                <strong className="font-medium">
                  {formatDateLong(editingEntry?.date ?? date)}
                </strong>
                {editingEntry && date !== editingEntry.date && (
                  <> — salvar vai mover o registro para esta data.</>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-full justify-center sm:ml-auto sm:h-7 sm:w-auto"
                onClick={() => onCancelEdit?.(date)}
              >
                Cancelar edição
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <PeriodEditor
              label="Manhã"
              value={morning}
              fallback={settings.defaultMorning}
              onChange={setMorning}
            />
            <PeriodEditor
              label="Tarde"
              value={afternoon}
              fallback={settings.defaultAfternoon}
              onChange={setAfternoon}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="day-note">Observação (opcional)</Label>
            <Textarea
              id="day-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Ex.: reunião, reposição de aula, saída antecipada..."
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm text-muted-foreground">Saldo do dia:</span>
              <Badge variant="outline" className={cn('tabular-nums', deltaTone)}>
                {formatSignedAulas(delta, settings.minutesPerAula)} aulas
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDuration(delta)} · trabalhado {formatDuration(minutes)}
              </span>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {existing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-11 w-full sm:h-7 sm:w-auto"
                    >
                      <Trash2Icon />
                      Remover
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remover o registro deste dia?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        O dia volta a valer como jornada padrão, com saldo zero.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={async () => {
                          try {
                            await onDelete(existing.id)
                            toast.success('Lançamento removido.')
                            onFinishEdit?.(date)
                          } catch (deleteError) {
                            toast.error(errorMessage(deleteError))
                          }
                        }}
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="h-11 w-full sm:h-8 sm:w-auto"
              >
                {saving
                  ? 'Salvando...'
                  : existing
                    ? 'Atualizar dia'
                    : 'Salvar dia'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
