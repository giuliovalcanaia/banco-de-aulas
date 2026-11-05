import { CalendarIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

type DateFieldProps = {
  id?: string
  value: string
  onChange: (iso: string) => void
}

function isoToBr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Mostra a data como dd/mm/aaaa, mas mantém o input nativo por baixo para
 * continuar usando o calendário e a validação do navegador.
 */
export function DateField({ id, value, onChange }: DateFieldProps) {
  const openPicker = (input: HTMLInputElement) => {
    try {
      input.showPicker()
    } catch {
      // Navegadores sem showPicker continuam abrindo pelo calendário nativo.
    }
  }

  return (
    <div className="group relative w-full sm:w-40">
      <Input
        value={isoToBr(value)}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        placeholder="dd/mm/aaaa"
        className="pointer-events-none h-11 w-full pr-9 text-base group-focus-within:border-ring group-focus-within:ring-3 group-focus-within:ring-ring/50 sm:h-8 sm:text-sm"
      />
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => openPicker(event.currentTarget)}
        className="absolute inset-0 h-full w-full cursor-pointer text-base opacity-0"
      />
      <CalendarIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
