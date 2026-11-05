import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SCHEDULE_PERIODS, SCHEDULE_TIMES } from '@/lib/schedule'
import { cn } from '@/lib/utils'

type TimeSelectProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}

/** Menu de horários com a grade de aulas da escola, no lugar do relógio nativo. */
export function TimeSelect({
  id,
  value,
  onChange,
  ariaLabel,
  className,
}: TimeSelectProps) {
  const isPreset = SCHEDULE_TIMES.includes(value)
  const hasCustomValue = value !== '' && !isPreset

  return (
    <Select
      value={value === '' ? undefined : value}
      onValueChange={onChange}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn('w-[7.5rem]', className)}
      >
        <SelectValue placeholder="--:--" />
      </SelectTrigger>
      <SelectContent>
        {SCHEDULE_PERIODS.map((period) => (
          <SelectGroup key={period.label}>
            <SelectLabel>{period.label}</SelectLabel>
            {period.times.map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        {hasCustomValue && (
          <SelectGroup>
            <SelectLabel>Outro</SelectLabel>
            <SelectItem value={value}>{value}</SelectItem>
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
