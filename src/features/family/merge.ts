import type { FamilyState } from './schema'

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
 * Merges two family states record by record: the newer `updatedAt` wins, deletes are kept as
 * tombstones. Two phones that brushed offline never lose each other's brushings.
 */
export function mergeFamilyStates(a: FamilyState, b: FamilyState): FamilyState {
  return {
    schema: 1,
    kids: mergeRecords(a.kids, b.kids),
    brushings: mergeRecords(a.brushings, b.brushings),
    settings: newer(a.settings, b.settings) ?? a.settings,
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
