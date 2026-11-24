import {
  addDays,
  format,
  getISOWeek,
  getISOWeekYear,
  isValid,
  parseISO,
  startOfISOWeek,
} from 'date-fns'
import { de } from 'date-fns/locale'
import type { Slot } from '@/features/family/schema'

/** Local calendar date as `YYYY-MM-DD` (the phones are in the family's own time zone). */
export function isoDay(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Morning until 15:00, evening after. Children cannot choose: brushing twice in one morning would
 * otherwise use up the evening's photo fields. A missed brushing is entered by a parent.
 */
export function slotForTime(date: Date): Slot {
  return date.getHours() < 15 ? 'morning' : 'evening'
}

/** Seven days with `date` in the middle (three before, three after), shifted by `offset` weeks. */
export function daysAround(date: Date, offset = 0): Date[] {
  const first = addDays(date, offset * 7 - 3)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

/** The Monday of the week of `date`, `YYYY-MM-DD`: the key of a week's reward photo. */
export function weekKey(date: Date): string {
  return isoDay(startOfISOWeek(date))
}

/** The seven days (Monday to Sunday) of the week that starts on `week`. */
export function weekDays(week: string): string[] {
  const monday = parseISO(week)
  return Array.from({ length: 7 }, (_, i) => isoDay(addDays(monday, i)))
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

/** ISO calendar week number of the week that starts on Monday `week`. */
export function weekNumber(week: string): number {
  return getISOWeek(parseISO(week))
}

/** The year the ISO calendar week belongs to (around New Year it differs from the date's year). */
export function weekYear(week: string): number {
  return getISOWeekYear(parseISO(week))
}

/** Compact date range of a week: `12.–18. Jan.`, or `30. Nov. – 6. Dez.` across two months. */
export function weekRangeShort(week: string): string {
  const first = parseISO(week)
  const last = addDays(first, 6)
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}.–${last.getDate()}. ${format(last, 'MMM', { locale: de })}`
  }
  return `${format(first, 'd. MMM', { locale: de })} – ${format(last, 'd. MMM', { locale: de })}`
}

/** `KW 3 · 12.–18. Jan.` */
export function weekLabel(week: string): string {
  return `KW ${weekNumber(week)} · ${weekRangeShort(week)}`
}
