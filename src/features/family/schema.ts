import { z } from 'zod'

export const ANIMALS = ['fox', 'hedgehog', 'owl', 'rabbit', 'squirrel', 'bear', 'koala'] as const
const animalSchema = z.enum(ANIMALS)
export type Animal = z.infer<typeof animalSchema>

const TOOTHBRUSHES = ['electric', 'manual'] as const
const toothbrushSchema = z.enum(TOOTHBRUSHES)
export type Toothbrush = z.infer<typeof toothbrushSchema>

export const SLOTS = ['morning', 'evening'] as const
export const slotSchema = z.enum(SLOTS)
export type Slot = z.infer<typeof slotSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Every record carries `updatedAt`; on merge the newer one wins. Deletes are tombstones. */
const kidSchema = z.object({
  id: z.string(),
  name: z.string().max(40),
  animal: animalSchema,
  /** Missing in data from before this setting existed: counts as electric. */
  toothbrush: toothbrushSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deleted: z.boolean().optional(),
})
export type Kid = z.infer<typeof kidSchema>

const brushingSchema = z.object({
  id: z.string(),
  kidId: z.string(),
  date: isoDate,
  slot: slotSchema,
  /** When the brushing ended (or was entered by a parent). */
  at: z.string(),
  /** Seconds actually brushed; 0 for a parent's manual entry. */
  seconds: z.number().int().min(0),
  source: z.enum(['timer', 'manual']),
  updatedAt: z.string(),
  deleted: z.boolean().optional(),
})
export type Brushing = z.infer<typeof brushingSchema>

const settingsSchema = z.object({
  music: z.boolean(),
  gong: z.boolean(),
  updatedAt: z.string(),
})
export type Settings = z.infer<typeof settingsSchema>

/** One field of the week's photo, uncovered by a child after brushing. */
const revealedCellSchema = z.object({ kidId: z.string(), at: z.string() })

/**
 * The reward photo of one week (Monday to Sunday), shared by all children of the family. Each
 * brushing lets the child who brushed uncover four fields of it (see rewards.ts).
 */
const weekPhotoSchema = z.object({
  photoId: z.string(),
  /** Field index (as a string) → who uncovered it. Fields are never covered again. */
  cells: z.record(z.string(), revealedCellSchema),
  updatedAt: z.string(),
})
export type WeekPhoto = z.infer<typeof weekPhotoSchema>

/**
 * The plan of one photo (see docs/occasions.md), keyed by photo id: the occasion it is kept for,
 * or the week it is pinned to (Monday, `YYYY-MM-DD`). `occasion: null` and no `week` mean the
 * plan was taken off again; the record stays so the newer choice wins on merge.
 */
const photoOccasionSchema = z.object({
  occasion: z.string().nullable(),
  week: isoDate.optional(),
  updatedAt: z.string(),
})

const familyStateSchema = z.object({
  // Version 2 added `weekPhotos`, version 3 `photoOccasions`. Older apps refuse a newer version
  // (and so never drop what they do not know); this app reads 1 to 3 and writes 3.
  schema: z.union([z.literal(1), z.literal(2), z.literal(3)]).transform((): 3 => 3),
  kids: z.record(z.string(), kidSchema),
  brushings: z.record(z.string(), brushingSchema),
  settings: settingsSchema,
  /** Keyed by the Monday of the week, `YYYY-MM-DD`. */
  weekPhotos: z.record(isoDate, weekPhotoSchema).default({}),
  photoOccasions: z.record(z.string(), photoOccasionSchema).default({}),
})
export type FamilyState = z.output<typeof familyStateSchema>

const EPOCH = '1970-01-01T00:00:00.000Z'

export function emptyFamilyState(): FamilyState {
  return {
    schema: 3,
    kids: {},
    brushings: {},
    settings: { music: true, gong: true, updatedAt: EPOCH },
    weekPhotos: {},
    photoOccasions: {},
  }
}

/** Parses unknown JSON (server or localStorage) and drops anything that does not fit. */
export function parseFamilyState(raw: unknown): FamilyState | null {
  const result = familyStateSchema.safeParse(raw)
  return result.success ? result.data : null
}
