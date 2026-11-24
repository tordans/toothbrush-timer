import { addDays, parseISO } from 'date-fns'
import { isoDay, weekKey } from '@/lib/dates'

/**
 * Occasions of the year that can have their own photo (see docs/occasions.md). The week of an
 * occasion is the Monday-to-Sunday week that contains its day. The list is in priority order:
 * when two fall into one week, the earlier one wins. Advent comes last, so the Wichtel only
 * appear in Advent weeks without another occasion.
 */
const OCCASIONS = [
  { id: 'nikolaus', name: 'Nikolaus' },
  { id: 'christmas', name: 'Weihnachten' },
  { id: 'new-year', name: 'Silvester' },
  { id: 'easter', name: 'Ostern' },
  { id: 'halloween', name: 'Halloween' },
  { id: 'advent', name: 'Adventszeit (Wichtel)' },
] as const

export type OccasionId = (typeof OCCASIONS)[number]['id']

export function occasionName(id: string): string | undefined {
  return OCCASIONS.find((o) => o.id === id)?.name
}

/** Easter Sunday (Gregorian calendar, anonymous algorithm), as `YYYY-MM-DD`. */
export function easterSunday(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The days in `year` that make a week belong to the occasion. */
function occasionDays(id: OccasionId, year: number): string[] {
  switch (id) {
    case 'nikolaus':
      return [`${year}-12-06`]
    case 'christmas':
      return [`${year}-12-24`]
    case 'new-year':
      return [`${year}-12-31`]
    case 'easter':
      return [easterSunday(year)]
    case 'halloween':
      return [`${year}-10-31`]
    case 'advent':
      // The days of the Advent calendar.
      return Array.from({ length: 23 }, (_, i) => `${year}-12-${String(i + 1).padStart(2, '0')}`)
  }
}

/** The occasions of the week that starts on Monday `week`, most important first. */
export function occasionsOfWeek(week: string): OccasionId[] {
  const monday = parseISO(week)
  const days = new Set(Array.from({ length: 7 }, (_, i) => isoDay(addDays(monday, i))))
  const years = new Set([...days].map((d) => Number(d.slice(0, 4))))
  return OCCASIONS.map((o) => o.id).filter((id) =>
    [...years].some((y) => occasionDays(id, y).some((d) => days.has(d))),
  )
}

/** The Monday of the next week that has `id` as its first occasion, from `fromWeek` on. */
export function nextWeekOf(id: OccasionId, fromWeek: string): string | undefined {
  let week = fromWeek
  for (let i = 0; i < 60; i++) {
    if (occasionsOfWeek(week)[0] === id) return week
    week = weekKey(addDays(parseISO(week), 7))
  }
  return undefined
}
