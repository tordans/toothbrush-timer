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
export function unusedPhotos(family: FamilyState, photos: Photo[] | null): Photo[] {
  const used = usedPhotoIds(family)
  return (photos ?? []).filter((p) => !used.has(p.id))
}

/** The occasion a photo is kept for, or null. */
export function photoOccasion(family: FamilyState, photoId: string): string | null {
  return family.photoOccasions[photoId]?.occasion ?? null
}

/**
 * Unused photos in the normal order. Photos kept for an occasion wait for its week (also into the
 * next year, if their week passed without them), so a Christmas photo is never used up in October.
 */
export function regularPhotos(family: FamilyState, photos: Photo[] | null): Photo[] {
  return unusedPhotos(family, photos).filter((p) => !photoOccasion(family, p.id))
}

/** An unused photo kept for one of this week's occasions, the most important occasion first. */
function occasionPhoto(family: FamilyState, photos: Photo[] | null, week: string): Photo | null {
  const unused = unusedPhotos(family, photos)
  for (const occasion of occasionsOfWeek(week)) {
    const photo = unused.find((p) => photoOccasion(family, p.id) === occasion)
    if (photo) return photo
  }
  return null
}

export type WeekPhotoInfo = {
  photo: Photo
  /** Field index → uncovered. */
  revealed: Set<number>
  /** False while the current week has not uncovered anything yet (the photo is only proposed). */
  assigned: boolean
}

/**
 * The photo of a week. The current week takes a photo kept for one of its occasions, or else the
 * oldest photo in the normal order, until its first field is uncovered; from then on the choice
 * is stored. Older weeks only have a photo if one was stored.
 * Null when there is none, or when its photo was deleted.
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
  const next = occasionPhoto(family, photos, week) ?? regularPhotos(family, photos)[0]
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
 * True when photos are in use but none is left for next week: the parents' gear shows a hint a
 * week ahead, so the children never meet a week without a photo.
 */
export function needsNewPhotos(
  family: FamilyState,
  photos: Photo[] | null,
  currentWeek: string,
): boolean {
  if (!photosEnabled(photos)) return false
  const regular = regularPhotos(family, photos).length
  const thisWeek = family.weekPhotos[currentWeek]
    ? null
    : photoForWeek(family, photos, currentWeek, currentWeek)
  const thisWeekTakesOne = thisWeek && !photoOccasion(family, thisWeek.photo.id) ? 1 : 0
  return regular - thisWeekTakesOne < 1
}

/**
 * Parents: next week has an occasion and no photo is kept for it yet. The gear shows a hint a
 * week ahead; the week works without one, it then takes the next photo in the normal order.
 */
export function occasionWithoutPhoto(
  family: FamilyState,
  photos: Photo[] | null,
  currentWeek: string,
): OccasionId | null {
  if (!photosEnabled(photos)) return null
  const nextWeek = weekKey(addDays(parseISO(currentWeek), 7))
  const occasion = occasionsOfWeek(nextWeek)[0]
  if (!occasion) return null
  return occasionPhoto(family, photos, nextWeek) ? null : occasion
}
