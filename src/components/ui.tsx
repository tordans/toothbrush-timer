import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import { ANIMALS, type Animal as AnimalId, type Toothbrush } from '@/features/family/schema'
import { Animal, ANIMAL_NAMES } from '@/features/forest/Animal'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'lg' | 'xl'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={twMerge(
        'inline-flex touch-manipulation items-center justify-center gap-2 rounded-full font-extrabold transition-transform active:scale-95 disabled:opacity-50',
        size === 'md' && 'px-5 py-2.5 text-base',
        size === 'lg' && 'px-7 py-3.5 text-xl',
        size === 'xl' && 'px-10 py-5 text-2xl sm:text-3xl',
        variant === 'primary' &&
          'bg-sun text-bark-900 shadow-[0_4px_0_#c9962a] active:shadow-[0_1px_0_#c9962a]',
        variant === 'secondary' &&
          'bg-cream text-bark-800 shadow-[0_4px_0_#d2b593] active:shadow-[0_1px_0_#d2b593]',
        variant === 'ghost' && 'bg-white/20 text-white backdrop-blur-sm',
        variant === 'danger' && 'bg-[#e4685a] text-white shadow-[0_4px_0_#b24a3f]',
        className,
      )}
      {...props}
    />
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={twMerge('rounded-3xl bg-cream p-5 shadow-lg sm:p-6', className)}>
      {children}
    </div>
  )
}

export function AnimalBadge({ animal, className }: { animal: AnimalId; className?: string }) {
  return (
    <span
      className={twMerge(
        'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-moss-100 p-1',
        className,
      )}
    >
      <Animal animal={animal} className="h-full w-full" />
    </span>
  )
}

export function AnimalPicker({
  value,
  onChange,
}: {
  value: AnimalId
  onChange: (animal: AnimalId) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="radiogroup" aria-label="Tier">
      {ANIMALS.map((animal) => (
        <button
          key={animal}
          type="button"
          role="radio"
          aria-checked={value === animal}
          onClick={() => onChange(animal)}
          className={twMerge(
            'flex flex-col items-center rounded-2xl border-4 p-1.5 text-sm font-bold transition active:scale-95',
            value === animal
              ? 'border-sun bg-white text-bark-900'
              : 'border-transparent bg-moss-50 text-bark-700',
          )}
        >
          <Animal animal={animal} className="h-14 w-14" />
          {ANIMAL_NAMES[animal]}
        </button>
      ))}
    </div>
  )
}

/** A button that only fires after being held, so small fingers do not open the parents' area. */
export function HoldButton({
  onHold,
  children,
  label,
  ms = 1200,
  className,
}: {
  onHold: () => void
  children: ReactNode
  label: string
  ms?: number
  className?: string
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [holding, setHolding] = useState(false)
  const [hint, setHint] = useState(false)

  const start = () => {
    setHolding(true)
    setHint(false)
    timer.current = setTimeout(() => {
      setHolding(false)
      onHold()
    }, ms)
  }
  const cancel = () => {
    setHolding(false)
    clearTimeout(timer.current)
  }
  /** Let go too early: explain that this button has to be held. */
  const release = () => {
    if (!holding) return
    cancel()
    setHint(true)
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setHint(false), 2500)
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={start}
      onPointerUp={release}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.repeat) return
        if (e.key === 'Enter' || e.key === ' ') onHold()
      }}
      // touch-none: a finger that drifts a little must not turn the hold into a scroll
      className={twMerge('relative touch-none select-none', className)}
    >
      {children}
      <svg
        viewBox="0 0 40 40"
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="#f6c94c"
          strokeWidth="3"
          strokeDasharray="113.1"
          strokeDashoffset={holding ? 0 : 113.1}
          style={{ transition: holding ? `stroke-dashoffset ${ms}ms linear` : 'none' }}
        />
      </svg>
      {hint && (
        <span
          role="status"
          className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-full bg-cream px-3 py-1.5 text-sm font-bold text-bark-800 shadow-lg"
        >
          Für Eltern: gedrückt halten
        </span>
      )}
    </button>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 text-left font-bold transition active:scale-[0.98]"
    >
      {label}
      <span
        className={twMerge(
          'relative h-8 w-14 shrink-0 rounded-full transition-colors',
          checked ? 'bg-moss-500' : 'bg-bark-200',
        )}
      >
        <span
          className={twMerge(
            'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-7' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  )
}

const TOOTHBRUSH_OPTIONS: { value: Toothbrush; label: string; detail: string }[] = [
  { value: 'electric', label: 'Elektrische Zahnbürste', detail: '2 Minuten' },
  { value: 'manual', label: 'Handzahnbürste', detail: '3 Minuten' },
]

/** Electric or manual brush; decides how long the timer runs. Nothing is preselected. */
export function ToothbrushPicker({
  value,
  onChange,
}: {
  value: Toothbrush | null
  onChange: (toothbrush: Toothbrush) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Zahnbürste">
      {TOOTHBRUSH_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={twMerge(
            'flex flex-col items-center rounded-2xl border-4 px-2 py-3 text-center font-bold transition active:scale-95',
            value === option.value
              ? 'border-sun bg-white text-bark-900'
              : 'border-transparent bg-moss-50 text-bark-700',
          )}
        >
          {option.label}
          <span className="text-sm font-semibold opacity-75">{option.detail}</span>
        </button>
      ))}
    </div>
  )
}
