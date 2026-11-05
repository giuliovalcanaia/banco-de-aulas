import { useEffect, useState, type FormEvent } from 'react'
import { Trash2Icon, XIcon } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { DayEntry, Settings, TimeRange } from '@/lib/types'
import { formatDateLong, isValidISODate, todayISO } from '@/lib/date'
import {
  dayMinutes,
  defaultDayMinutes,
  formatDuration,
  formatSignedAulas,
  isValidTime,
  timeToMinutes,
} from '@/lib/time'
import { cn } from '@/lib/utils'

type DayFormProps = {
  settings: Settings
  entriesByDate: Map<string, DayEntry>
  initialDate: string
  onSave: (input: Omit<DayEntry, 'id' | 'updatedAt'>) => void
  onDelete: (id: string) => void
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
          onClick={() => onChange(fallback)}
        >
          Adicionar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5">
      <span className="w-14 text-sm font-medium">{label}</span>
      <Input
        type="time"
        value={value.start}
        onChange={(event) => onChange({ ...value, start: event.target.value })}
        className="w-[7.5rem]"
        aria-label={`${label}: início`}
      />
      <span className="text-sm text-muted-foreground">até</span>
      <Input
        type="time"
        value={value.end}
        onChange={(event) => onChange({ ...value, end: event.target.value })}
        className="w-[7.5rem]"
        aria-label={`${label}: fim`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="ml-auto"
        onClick={() => onChange(null)}
        aria-label={`Remover ${label}`}
      >
        <XIcon />
      </Button>
    </div>
  )
}

function validatePeriod(label: string, range: TimeRange | null): string | null {
  if (!range) return null
  if (!isValidTime(range.start) || !isValidTime(range.end)) {
    return `Informe horários válidos no período da ${label}.`
  }
  const start = timeToMinutes(range.start)
  const end = timeToMinutes(range.end)
  if (start === null || end === null || end <= start) {
    return `No período da ${label}, o fim deve ser depois do início.`
  }
  return null
}

export function DayForm({
  settings,
  entriesByDate,
  initialDate,
  onSave,
  onDelete,
}: DayFormProps) {
  const [date, setDate] = useState(initialDate)
  const [morning, setMorning] = useState<TimeRange | null>(settings.defaultMorning)
  const [afternoon, setAfternoon] = useState<TimeRange | null>(
    settings.defaultAfternoon,
  )
  const [note, setNote] = useState('')

  const existing = entriesByDate.get(date)

  useEffect(() => {
    setDate(initialDate)
  }, [initialDate])

  useEffect(() => {
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
  }, [date, entriesByDate, settings.defaultMorning, settings.defaultAfternoon])

  const minutes = dayMinutes({ morning, afternoon })
  const delta = minutes - defaultDayMinutes(settings)

  const applyDefault = () => {
    setMorning(settings.defaultMorning)
    setAfternoon(settings.defaultAfternoon)
  }

  const applyNoon = () => {
    setMorning({
      start: morning?.start ?? settings.defaultMorning.start,
      end: '12:00',
    })
  }

  const applyLate = () => {
    setAfternoon({
      start: afternoon?.start ?? settings.defaultAfternoon.start,
      end: '17:45',
    })
  }

  const applyDayOff = () => {
    setMorning(null)
    setAfternoon(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValidISODate(date)) {
      toast.error('Escolha uma data válida.')
      return
    }

    const error =
      validatePeriod('manhã', morning) ?? validatePeriod('tarde', afternoon)
    if (error) {
      toast.error(error)
      return
    }

    onSave({ date, morning, afternoon, note: note.trim() })
    toast.success(existing ? 'Dia atualizado.' : 'Dia salvo.')
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
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="day-date">Dia</Label>
              <Input
                id="day-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-44"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDate(todayISO())}
            >
              Hoje
            </Button>
            <span className="pb-2 text-sm capitalize text-muted-foreground">
              {formatDateLong(date)}
            </span>
          </div>

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

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={applyDefault}>
              Jornada padrão
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={applyNoon}>
              Saída 12:00
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={applyLate}>
              Saída 17:45
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={applyDayOff}>
              Folga
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="day-note">Observação (opcional)</Label>
            <Textarea
              id="day-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Ex.: reunião, reposição de aula, saída antecipada..."
            />
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Saldo do dia:</span>
              <Badge variant="outline" className={cn('tabular-nums', deltaTone)}>
                {formatSignedAulas(delta, settings.minutesPerAula)} aulas
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDuration(delta)} · trabalhado {formatDuration(minutes)}
              </span>
            </div>

            <div className="flex gap-2">
              {existing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm">
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
                        onClick={() => onDelete(existing.id)}
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button type="submit">
                {existing ? 'Atualizar dia' : 'Salvar dia'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
