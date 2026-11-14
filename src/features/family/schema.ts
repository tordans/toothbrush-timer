import { z } from 'zod'
import { MUSIC_STYLES } from '@/features/timer/music'

export const ANIMALS = ['fox', 'hedgehog', 'owl', 'rabbit', 'squirrel', 'bear'] as const
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
  /** Which song plays; `mix` picks another one each time. Missing in older data: `mix`. */
  musicStyle: z.enum([...MUSIC_STYLES, 'mix']).optional(),
  gong: z.boolean(),
  updatedAt: z.string(),
})
export type Settings = z.infer<typeof settingsSchema>

const familyStateSchema = z.object({
  schema: z.literal(1),
  kids: z.record(z.string(), kidSchema),
  brushings: z.record(z.string(), brushingSchema),
  settings: settingsSchema,
})
export type FamilyState = z.infer<typeof familyStateSchema>

const EPOCH = '1970-01-01T00:00:00.000Z'

export function emptyFamilyState(): FamilyState {
  return {
    schema: 1,
    kids: {},
    brushings: {},
    settings: { music: true, gong: true, updatedAt: EPOCH },
  }
}

/** Parses unknown JSON (server or localStorage) and drops anything that does not fit. */
export function parseFamilyState(raw: unknown): FamilyState | null {
  const result = familyStateSchema.safeParse(raw)
  return result.success ? result.data : null
}
