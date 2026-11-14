import { addDays, format, isValid, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Slot } from '@/features/family/schema'

/** Local calendar date as `YYYY-MM-DD` (the phones are in the family's own time zone). */
export function isoDay(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Morning until 14:00, evening after. The start screen lets the child switch. */
export function slotForTime(date: Date): Slot {
  return date.getHours() < 14 ? 'morning' : 'evening'
}

/** Seven days with `date` in the middle (three before, three after), shifted by `offset` weeks. */
export function daysAround(date: Date, offset = 0): Date[] {
  const first = addDays(date, offset * 7 - 3)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

export function weekdayShort(date: Date): string {
  return format(date, 'EEEEEE', { locale: de })
}

export function dayMonth(date: Date): string {
  return format(date, 'd. MMMM', { locale: de })
}

export function dayMonthShort(date: Date): string {
  return format(date, 'd. MMM', { locale: de })
}

export function weekRangeLabel(days: Date[]): string {
  const first = days[0]
  const last = days[days.length - 1]
  if (!first || !last) return ''
  return `${format(first, 'd. MMM', { locale: de })} – ${format(last, 'd. MMM', { locale: de })}`
}

export function fromIsoDay(day: string): Date {
  return parseISO(day)
}

export function timeLabel(iso: string): string {
  const date = parseISO(iso)
  return isValid(date) ? format(date, 'HH:mm') : ''
}
