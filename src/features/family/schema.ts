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

const familyStateSchema = z.object({
  // Version 2 added `weekPhotos`. Older apps refuse version 2 (and so never drop the photos);
  // this app reads version 1 and writes version 2.
  schema: z.union([z.literal(1), z.literal(2)]).transform((): 2 => 2),
  kids: z.record(z.string(), kidSchema),
  brushings: z.record(z.string(), brushingSchema),
  settings: settingsSchema,
  /** Keyed by the Monday of the week, `YYYY-MM-DD`. */
  weekPhotos: z.record(isoDate, weekPhotoSchema).default({}),
})
export type FamilyState = z.output<typeof familyStateSchema>

const EPOCH = '1970-01-01T00:00:00.000Z'

export function emptyFamilyState(): FamilyState {
  return {
    schema: 2,
    kids: {},
    brushings: {},
    settings: { music: true, gong: true, updatedAt: EPOCH },
    weekPhotos: {},
  }
}

/** Parses unknown JSON (server or localStorage) and drops anything that does not fit. */
export function parseFamilyState(raw: unknown): FamilyState | null {
  const result = familyStateSchema.safeParse(raw)
  return result.success ? result.data : null
}
