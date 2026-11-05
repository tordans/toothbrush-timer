import type { Brushing, FamilyState, Kid, Slot } from './schema'

export function activeKids(state: FamilyState): Kid[] {
  return Object.values(state.kids)
    .filter((kid) => !kid.deleted)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
}

export function brushingsFor(
  state: FamilyState,
  kidId: string,
  date: string,
  slot: Slot,
): Brushing[] {
  return Object.values(state.brushings).filter(
    (b) => !b.deleted && b.kidId === kidId && b.date === date && b.slot === slot,
  )
}

export function isBrushed(state: FamilyState, kidId: string, date: string, slot: Slot): boolean {
  return brushingsFor(state, kidId, date, slot).length > 0
}
