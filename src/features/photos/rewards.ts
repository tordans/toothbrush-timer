import { addDays, parseISO } from 'date-fns'
import type { FamilyState } from '@/features/family/schema'
import { weekDays, weekKey } from '@/lib/dates'
import type { Photo } from './api'
import { occasionsOfWeek, type OccasionId } from './occasions'

/**
 * Reward photos: each week (Monday to Sunday) the family gets one photo, covered at first. Every
 * brushing lets the child uncover FIELDS_PER_BRUSHING fields, one for each corner of the mouth.
 * Two brushings a day for seven days uncover all FIELDS. When the week is over, the photo stays
 * as it is. Without any uploaded photos the whole feature is hidden.
 */

const FIELDS_PER_BRUSHING = 4
export const FIELDS = 7 * 2 * FIELDS_PER_BRUSHING // 56

/** 8 × 7 fields for a landscape (or square) photo, 7 × 8 for a portrait one. */
export function photoGrid(photo: Pick<Photo, 'width' | 'height'>): { cols: number; rows: number } {
  return photo.width >= photo.height ? { cols: 8, rows: 7 } : { cols: 7, rows: 8 }
}

export function photosEnabled(photos: Photo[] | null): boolean {
  return (photos?.length ?? 0) > 0
}

function usedPhotoIds(family: FamilyState): Set<string> {
  return new Set(Object.values(family.weekPhotos).map((w) => w.photoId))
}

/** Photos that no week has shown yet, oldest first. */
function unusedPhotos(family: FamilyState, photos: Photo[] | null): Photo[] {
  const used = usedPhotoIds(family)
  return (photos ?? []).filter((p) => !used.has(p.id))
}

/** The occasion a photo is kept for, or null. */
export function photoOccasion(family: FamilyState, photoId: string): string | null {
  return family.photoOccasions[photoId]?.occasion ?? null
}

/** The week (Monday) a photo is pinned to, or null. */
export function photoPin(family: FamilyState, photoId: string): string | null {
  return family.photoOccasions[photoId]?.week ?? null
}

/** Pinned weeks from `currentWeek` on, each with the oldest unused photo pinned to it. */
function pinOwners(family: FamilyState, unused: Photo[], currentWeek: string): Map<string, Photo> {
  const owners = new Map<string, Photo>()
  for (const photo of unused) {
    const week = photoPin(family, photo.id)
    // Two phones may pin different photos to one week while offline: the older photo keeps it,
    // the other one goes back to the normal order.
    if (week && week >= currentWeek && !owners.has(week)) owners.set(week, photo)
  }
  return owners
}

/**
 * Unused photos in the normal order. Photos kept for an occasion or pinned to a week from
 * `currentWeek` on wait for their week (also into the next year, if an occasion week passed
 * without them), so a Christmas photo is never used up in October. A pin to a past week counts
 * as normal again.
 */
export function regularPhotos(
  family: FamilyState,
  photos: Photo[] | null,
  currentWeek: string,
): Photo[] {
  const unused = unusedPhotos(family, photos)
  const pinned = new Set([...pinOwners(family, unused, currentWeek).values()].map((p) => p.id))
  return unused.filter((p) => !photoOccasion(family, p.id) && !pinned.has(p.id))
}

export type WeekPlan = {
  /** The Monday of the week. */
  week: string
  photo: Photo | null
  /** Why the week has this photo: shown (stored), pinned to the week, kept for its occasion, or next in line. */
  source: 'shown' | 'pinned' | 'occasion' | 'regular' | null
  /** The most important occasion of the week. */
  occasion: OccasionId | undefined
  /** The week already uncovered a field, so its photo is fixed. */
  started: boolean
}

/**
 * The photos of `count` weeks from `currentWeek` on: the one schedule the forest, the photo page
 * and the parents' view share. Per week, in this order:
 * 1. a stored photo (the week has started; null if that photo was deleted),
 * 2. an unused photo pinned to exactly this week,
 * 3. an unused photo kept for one of the week's occasions (the most important occasion first),
 * 4. the next photo of the normal order (see `regularPhotos`).
 * Each photo is used at most once.
 */
export function planWeeks(
  family: FamilyState,
  photos: Photo[] | null,
  currentWeek: string,
  count: number,
): WeekPlan[] {
  const unused = unusedPhotos(family, photos)
  const owners = pinOwners(family, unused, currentWeek)
  const queue = regularPhotos(family, photos, currentWeek)
  const planned = new Set<string>()
  const plan: WeekPlan[] = []
  let next = 0
  for (let i = 0; i < count; i++) {
    const week = weekKey(addDays(parseISO(currentWeek), i * 7))
    const occasions = occasionsOfWeek(week)
    const occasion = occasions[0]
    const stored = family.weekPhotos[week]
    if (stored) {
      const photo = photos?.find((p) => p.id === stored.photoId) ?? null
      plan.push({ week, photo, source: 'shown', occasion, started: true })
      continue
    }
    let photo: Photo | null = owners.get(week) ?? null
    let source: WeekPlan['source'] = photo ? 'pinned' : null
    if (!photo) {
      for (const o of occasions) {
        photo = unused.find((p) => !planned.has(p.id) && photoOccasion(family, p.id) === o) ?? null
        if (photo) break
      }
      source = photo ? 'occasion' : null
    }
    if (!photo) {
      photo = queue[next] ?? null
      if (photo) next++
      source = photo ? 'regular' : null
    }
    if (photo) planned.add(photo.id)
    plan.push({ week, photo, source, occasion, started: false })
  }
  return plan
}

export type WeekPhotoInfo = {
  photo: Photo
  /** Field index → uncovered. */
  revealed: Set<number>
  /** False while the current week has not uncovered anything yet (the photo is only proposed). */
  assigned: boolean
}

/**
 * The photo of a week. The current week takes the photo the plan gives it (see `planWeeks`) until
 * its first field is uncovered; from then on the choice is stored. Older weeks only have a photo
 * if one was stored. Null when there is none, or when its photo was deleted.
 */
export function photoForWeek(
  family: FamilyState,
  photos: Photo[] | null,
  week: string,
  currentWeek: string,
): WeekPhotoInfo | null {
  const stored = family.weekPhotos[week]
  if (stored) {
    const photo = photos?.find((p) => p.id === stored.photoId)
    if (!photo) return null
    return { photo, revealed: new Set(Object.keys(stored.cells).map(Number)), assigned: true }
  }
  if (week !== currentWeek) return null
  const next = planWeeks(family, photos, currentWeek, 1)[0]?.photo
  return next ? { photo: next, revealed: new Set(), assigned: false } : null
}

/** Brushed morning/evening slots of one child in a week, in time order, as `date` per slot. */
function brushedSlots(family: FamilyState, kidId: string, week: string): string[] {
  const days = new Set(weekDays(week))
  const slots = new Set<string>()
  for (const b of Object.values(family.brushings)) {
    if (b.deleted || b.kidId !== kidId || !days.has(b.date)) continue
    slots.add(`${b.date}|${b.slot === 'morning' ? 0 : 1}`)
  }
  return [...slots].sort().map((s) => s.split('|')[0]!)
}

function fieldsUsedBy(family: FamilyState, kidId: string, week: string): number {
  const cells = family.weekPhotos[week]?.cells ?? {}
  return Object.values(cells).filter((c) => c.kidId === kidId).length
}

/** How many fields this child may still uncover in this week. */
export function fieldsLeft(family: FamilyState, kidId: string, week: string): number {
  const earned = brushedSlots(family, kidId, week).length * FIELDS_PER_BRUSHING
  const covered = FIELDS - Object.keys(family.weekPhotos[week]?.cells ?? {}).length
  return Math.max(0, Math.min(earned - fieldsUsedBy(family, kidId, week), covered))
}

/**
 * Days of the week whose brushing has fields the child has not uncovered yet: the forest shows
 * the animal looking forward to the photo there. Uncovered fields count against the oldest
 * brushings first.
 */
export function daysWithFieldsLeft(family: FamilyState, kidId: string, week: string): Set<string> {
  let used = fieldsUsedBy(family, kidId, week)
  const left = fieldsLeft(family, kidId, week)
  const days = new Set<string>()
  if (left === 0) return days
  for (const date of brushedSlots(family, kidId, week)) {
    const spent = Math.min(used, FIELDS_PER_BRUSHING)
    used -= spent
    if (spent < FIELDS_PER_BRUSHING) days.add(date)
  }
  return days
}

/**
 * True when photos are in use but none is planned for next week: the parents' gear shows a hint
 * a week ahead, so the children never meet a week without a photo.
 */
export function needsNewPhotos(
  family: FamilyState,
  photos: Photo[] | null,
  currentWeek: string,
): boolean {
  if (!photosEnabled(photos)) return false
  return !planWeeks(family, photos, currentWeek, 2)[1]?.photo
}

/**
 * Parents: next week has an occasion and its photo is neither pinned nor kept for it. The gear
 * shows a hint a week ahead; the week works without one, it then takes the next photo in the
 * normal order.
 */
export function occasionWithoutPhoto(
  family: FamilyState,
  photos: Photo[] | null,
  currentWeek: string,
): OccasionId | null {
  if (!photosEnabled(photos)) return null
  const entry = planWeeks(family, photos, currentWeek, 2)[1]
  if (!entry?.occasion) return null
  return entry.source === 'pinned' || entry.source === 'occasion' || entry.source === 'shown'
    ? null
    : entry.occasion
}
