import { describe, expect, it } from 'vitest'
import { mergeFamilyStates } from '@/features/family/merge'
import { emptyFamilyState, parseFamilyState, type FamilyState } from '@/features/family/schema'
import type { Photo } from '@/features/photos/api'
import {
  daysWithFieldsLeft,
  fieldsLeft,
  needsNewPhotos,
  photoForWeek,
  photoGrid,
} from '@/features/photos/rewards'

const WEEK = '2026-11-09' // Monday
const T = '2026-11-10T08:00:00.000Z'

const photo = (id: string, created: string, width = 1024, height = 1024): Photo => ({
  id,
  width,
  height,
  bytes: 1,
  type: 'image/webp',
  created_at: created,
})

const brushing = (id: string, kidId: string, date: string, slot: 'morning' | 'evening') => ({
  id,
  kidId,
  date,
  slot,
  at: T,
  seconds: 120,
  source: 'timer' as const,
  updatedAt: T,
})

function state(patch: Partial<FamilyState>): FamilyState {
  return { ...emptyFamilyState(), ...patch }
}

describe('family state version 2', () => {
  it('reads version 1 data and adds empty week photos and occasions', () => {
    const parsed = parseFamilyState({
      ...emptyFamilyState(),
      schema: 1,
      weekPhotos: undefined,
      photoOccasions: undefined,
    })
    expect(parsed?.schema).toBe(3)
    expect(parsed?.weekPhotos).toEqual({})
    expect(parsed?.photoOccasions).toEqual({})
  })
})

describe('merging week photos', () => {
  it('keeps the fields uncovered on both phones for the same photo', () => {
    const a = state({
      weekPhotos: {
        [WEEK]: { photoId: 'p1', cells: { '1': { kidId: 'a', at: T } }, updatedAt: T },
      },
    })
    const b = state({
      weekPhotos: {
        [WEEK]: {
          photoId: 'p1',
          cells: { '2': { kidId: 'b', at: T } },
          updatedAt: '2026-11-11T08:00:00.000Z',
        },
      },
    })
    const merged = mergeFamilyStates(a, b).weekPhotos[WEEK]
    expect(Object.keys(merged?.cells ?? {}).sort()).toEqual(['1', '2'])
  })

  it('lets the newer photo win when two phones picked different ones', () => {
    const a = state({ weekPhotos: { [WEEK]: { photoId: 'p1', cells: {}, updatedAt: T } } })
    const b = state({
      weekPhotos: { [WEEK]: { photoId: 'p2', cells: {}, updatedAt: '2026-11-12T00:00:00.000Z' } },
    })
    expect(mergeFamilyStates(a, b).weekPhotos[WEEK]?.photoId).toBe('p2')
  })
})

describe('fields to uncover', () => {
  const family = state({
    brushings: {
      b1: brushing('b1', 'k1', '2026-11-09', 'morning'),
      b2: brushing('b2', 'k1', '2026-11-09', 'evening'),
      b3: brushing('b3', 'k1', '2026-11-10', 'morning'),
      // a second brushing of the same slot counts only once
      b4: brushing('b4', 'k1', '2026-11-10', 'morning'),
      // last week does not count
      b5: brushing('b5', 'k1', '2026-11-08', 'evening'),
    },
  })

  it('gives four fields per brushed slot of the week', () => {
    expect(fieldsLeft(family, 'k1', WEEK)).toBe(12)
  })

  it('subtracts the fields the child already uncovered, oldest brushings first', () => {
    const cells = Object.fromEntries(
      [0, 1, 2, 3, 4].map((i) => [String(i), { kidId: 'k1', at: T }]),
    )
    const used = state({
      ...family,
      weekPhotos: { [WEEK]: { photoId: 'p1', cells, updatedAt: T } },
    })
    expect(fieldsLeft(used, 'k1', WEEK)).toBe(7)
    expect([...daysWithFieldsLeft(used, 'k1', WEEK)].sort()).toEqual(['2026-11-09', '2026-11-10'])
  })
})

describe('photo of the week', () => {
  const photos = [
    photo('old', '2026-11-01T00:00:00.000Z'),
    photo('new', '2026-11-02T00:00:00.000Z'),
  ]

  it('proposes the oldest unused photo for the current week only', () => {
    const family = emptyFamilyState()
    expect(photoForWeek(family, photos, WEEK, WEEK)?.photo.id).toBe('old')
    expect(photoForWeek(family, photos, '2026-11-02', WEEK)).toBeNull()
  })

  it('asks the parents for photos when none is left for next week', () => {
    const family = emptyFamilyState()
    expect(needsNewPhotos(family, photos, WEEK)).toBe(false)
    expect(needsNewPhotos(family, photos.slice(0, 1), WEEK)).toBe(true)
    expect(needsNewPhotos(family, [], WEEK)).toBe(false)
  })

  it('splits landscape photos 8 × 7 and portrait ones 7 × 8', () => {
    expect(photoGrid({ width: 1600, height: 1200 })).toEqual({ cols: 8, rows: 7 })
    expect(photoGrid({ width: 1200, height: 1600 })).toEqual({ cols: 7, rows: 8 })
  })
})
