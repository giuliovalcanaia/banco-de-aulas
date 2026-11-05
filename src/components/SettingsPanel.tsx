import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { DownloadIcon, LogOutIcon, MailIcon, Trash2Icon, UploadIcon } from 'lucide-react'
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
import { TimeSelect } from '@/components/TimeSelect'
import { errorMessage } from '@/lib/errors'
import { AFTERNOON_BREAK, MORNING_BREAK } from '@/lib/schedule'
import { readImportFile } from '@/lib/storage'
import type { Settings, StoreData, TimeRange } from '@/lib/types'
import { isValidTime, rangeMinutes, timeToMinutes } from '@/lib/time'
import { cn } from '@/lib/utils'

const WEEKDAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

type SettingsPanelProps = {
  settings: Settings
  entryCount: number
  email?: string | null
  syncLabel?: string
  onSave: (settings: Settings) => Promise<void>
  onRefresh: () => void
  onSignOut: () => void
  onExport: () => void
  onImport: (data: StoreData) => Promise<void>
  onReset: () => Promise<void>
}

type RangeFieldsProps = {
  label: string
  value: TimeRange
  onChange: (value: TimeRange) => void
}

function RangeFields({ label, value, onChange }: RangeFieldsProps) {
  return (
    <div className="space-y-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0">
      <span className="text-sm font-medium sm:w-16">{label}</span>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
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

export function SettingsPanel({
  settings,
  entryCount,
  email,
  syncLabel,
  onSave,
  onRefresh,
  onSignOut,
  onExport,
  onImport,
  onReset,
}: SettingsPanelProps) {
  const [form, setForm] = useState<Settings>(settings)
  const [pendingImport, setPendingImport] = useState<StoreData | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const toggleWorkday = (day: number) => {
    setForm((previous) => {
      const hasDay = previous.workdays.includes(day)
      const workdays = hasDay
        ? previous.workdays.filter((item) => item !== day)
        : [...previous.workdays, day].sort((a, b) => a - b)
      return { ...previous, workdays }
    })
  }

  const handleSave = async () => {
    const ranges = [
      { range: form.defaultMorning, breakWindow: MORNING_BREAK },
      { range: form.defaultAfternoon, breakWindow: AFTERNOON_BREAK },
    ]

    const hasInvalidTime = ranges.some(
      ({ range }) =>
        !isValidTime(range.start) || !isValidTime(range.end),
    )
    if (hasInvalidTime) {
      toast.error('Preencha a jornada padrão com horários válidos.')
      return
    }

    const hasInvalidRange = ranges.some(({ range, breakWindow }) => {
      const start = timeToMinutes(range.start)
      const end = timeToMinutes(range.end)
      return (
        start === null ||
        end === null ||
        end <= start ||
        rangeMinutes(range, breakWindow) === 0
      )
    })
    if (hasInvalidRange) {
      toast.error('O fim de cada período deve ser depois do início.')
      return
    }

    if (!Number.isFinite(form.minutesPerAula) || form.minutesPerAula <= 0) {
      toast.error('A duração da aula deve ser maior que zero.')
      return
    }

    if (form.workdays.length === 0) {
      toast.error('Escolha pelo menos um dia útil.')
      return
    }

    setSaving(true)
    try {
      await onSave(form)
      toast.success('Ajustes salvos.')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      setPendingImport(await readImportFile(file))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível importar o arquivo.',
      )
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Jornada padrão</CardTitle>
          <CardDescription>
            Usada como referência para calcular o saldo. Dia sem registro vale
            exatamente esta jornada.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <RangeFields
              label="Manhã"
              value={form.defaultMorning}
              onChange={(defaultMorning) =>
                setForm({ ...form, defaultMorning })
              }
            />
            <RangeFields
              label="Tarde"
              value={form.defaultAfternoon}
              onChange={(defaultAfternoon) =>
                setForm({ ...form, defaultAfternoon })
              }
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="minutes-per-aula">Minutos por aula</Label>
              <Input
                id="minutes-per-aula"
                type="number"
                min={1}
                max={120}
                step={1}
                value={form.minutesPerAula}
                onChange={(event) =>
                  setForm({
                    ...form,
                    minutesPerAula: Number(event.target.value),
                  })
                }
                className="h-11 w-full sm:h-8 sm:w-32"
              />
              <p className="text-xs text-muted-foreground">
                Com 45 minutos, a jornada padrão de 7h30 (sem os lanches)
                equivale a 10 aulas.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Dias úteis</Label>
              <div className="grid grid-cols-7 gap-1.5 sm:flex sm:flex-wrap">
                {WEEKDAYS.map((day) => {
                  const selected = form.workdays.includes(day.value)
                  return (
                    <Button
                      key={day.value}
                      type="button"
                      size="sm"
                      variant={selected ? 'default' : 'outline'}
                      aria-pressed={selected}
                      onClick={() => toggleWorkday(day.value)}
                      className={cn(
                        'h-10 w-full px-0 text-xs sm:h-7 sm:w-auto sm:px-2.5 sm:text-[0.8rem]',
                        !selected && 'text-muted-foreground',
                      )}
                    >
                      {day.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-11 w-full sm:h-8 sm:w-auto"
            >
              {saving ? 'Salvando...' : 'Salvar ajustes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup e dados</CardTitle>
          <CardDescription>
            {entryCount === 0
              ? 'Nenhum lançamento salvo na nuvem.'
              : `${entryCount} ${entryCount === 1 ? 'lançamento salvo' : 'lançamentos salvos'} na nuvem.`}{' '}
            Exporte um JSON como cópia extra.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={onExport}
              className="h-11 w-full sm:h-8 sm:w-auto"
            >
              <DownloadIcon />
              Exportar JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-11 w-full sm:h-8 sm:w-auto"
            >
              <UploadIcon />
              Importar JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <Separator />

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Apagar todos os dados</p>
              <p className="text-xs text-muted-foreground">
                Remove todos os lançamentos e volta aos ajustes padrão.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-11 w-full sm:h-7 sm:w-auto"
                >
                  <Trash2Icon />
                  Apagar tudo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar todos os dados?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Exporte um backup antes se
                    quiser guardar o histórico.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        await onReset()
                        toast.success('Dados apagados.')
                      } catch (error) {
                        toast.error(errorMessage(error))
                      }
                    }}
                  >
                    Apagar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sincronização e acesso</CardTitle>
          <CardDescription>
            Os lançamentos são gravados no Firestore (Google Cloud) e
            sincronizados entre seus dispositivos. O acesso é protegido pelo
            login Google.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {email && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <MailIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{email}</span>
              <Badge variant="outline" className="ml-auto shrink-0">
                sessão ativa
              </Badge>
            </div>
          )}

          {syncLabel && (
            <p className="text-xs text-muted-foreground">{syncLabel}</p>
          )}

          <p className="text-xs text-muted-foreground">
            A sessão expira 30 dias após o login. O app funciona offline e
            envia as alterações quando a conexão voltar.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              className="h-11 w-full sm:h-8 sm:w-auto"
            >
              Tentar sincronizar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSignOut}
              className="h-11 w-full sm:h-8 sm:w-auto"
            >
              <LogOutIcon />
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar este backup?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo tem {pendingImport?.entries.length ?? 0}{' '}
              {pendingImport?.entries.length === 1 ? 'lançamento' : 'lançamentos'}.
              Os dados atuais serão substituídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingImport) {
                  try {
                    await onImport(pendingImport)
                    toast.success('Backup importado.')
                  } catch (error) {
                    toast.error(errorMessage(error))
                  }
                }
                setPendingImport(null)
              }}
            >
              Substituir dados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
