import type { FamilyState, WeekPhoto } from './schema'

type Stamped = { updatedAt: string }

function newer<T extends Stamped>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a) return b
  if (!b) return a
  return b.updatedAt > a.updatedAt ? b : a
}

function mergeRecords<T extends Stamped>(
  a: Record<string, T>,
  b: Record<string, T>,
): Record<string, T> {
  const out: Record<string, T> = { ...a }
  for (const [id, record] of Object.entries(b)) {
    const winner = newer(out[id], record)
    if (winner) out[id] = winner
  }
  return out
}

/**
 * The same photo on both sides: every uncovered field stays uncovered (the first child to uncover
 * a field keeps it). Different photos (two phones picked one offline): the newer one wins.
 */
function mergeWeekPhoto(a: WeekPhoto | undefined, b: WeekPhoto | undefined): WeekPhoto | undefined {
  if (!a || !b || a.photoId !== b.photoId) return newer(a, b)
  const cells = { ...a.cells }
  for (const [index, cell] of Object.entries(b.cells)) {
    const mine = cells[index]
    if (!mine || cell.at < mine.at) cells[index] = cell
  }
  return {
    photoId: a.photoId,
    cells,
    updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt,
  }
}

function mergeWeekPhotos(
  a: Record<string, WeekPhoto>,
  b: Record<string, WeekPhoto>,
): Record<string, WeekPhoto> {
  const out: Record<string, WeekPhoto> = { ...a }
  for (const [week, photo] of Object.entries(b)) {
    const merged = mergeWeekPhoto(out[week], photo)
    if (merged) out[week] = merged
  }
  return out
}

/**
 * Merges two family states record by record: the newer `updatedAt` wins, deletes are kept as
 * tombstones. Two phones that brushed offline never lose each other's brushings.
 */
export function mergeFamilyStates(a: FamilyState, b: FamilyState): FamilyState {
  return {
    schema: 3,
    kids: mergeRecords(a.kids, b.kids),
    brushings: mergeRecords(a.brushings, b.brushings),
    settings: newer(a.settings, b.settings) ?? a.settings,
    weekPhotos: mergeWeekPhotos(a.weekPhotos, b.weekPhotos),
    photoOccasions: mergeRecords(a.photoOccasions, b.photoOccasions),
  }
}

export function sameFamilyState(a: FamilyState, b: FamilyState): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      // Not toSorted(): the old Android Chrome does not have it.
      Object.entries(value as Record<string, unknown>)
        .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)]),
    )
  }
  return value
}
