import { describe, expect, it, vi } from 'vitest'
import { familyStore } from '@/features/family/family-store'
import { emptyFamilyState, type FamilyState } from '@/features/family/schema'
import type { Photo } from '@/features/photos/api'
import { planWeeks, regularPhotos } from '@/features/photos/rewards'

// The family store persists to localStorage, which Node does not have.
vi.hoisted(() => {
  const data = new Map<string, string>()
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  })
})

const T = '2026-11-10T08:00:00.000Z'
const NOW = '2026-11-16' // Monday
const NEXT = '2026-11-23'
const NIKOLAUS = '2026-11-30' // Nikolaus is on Sunday 6 Dec, so this week is Nikolaus week

const photo = (id: string, day: number): Photo => ({
  id,
  width: 1024,
  height: 1024,
  bytes: 1,
  type: 'image/webp',
  created_at: `2026-11-${String(day).padStart(2, '0')}T00:00:00.000Z`,
})

const photos = [photo('a', 1), photo('b', 2), photo('c', 3), photo('d', 4)]

function plans(entries: Record<string, { occasion?: string; week?: string }>): FamilyState {
  const family = emptyFamilyState()
  for (const [id, plan] of Object.entries(entries)) {
    family.photoOccasions[id] = { occasion: plan.occasion ?? null, week: plan.week, updatedAt: T }
  }
  return family
}

const ids = (family: FamilyState, count = 4) =>
  planWeeks(family, photos, NOW, count).map((e) => e.photo?.id ?? null)

describe('planWeeks', () => {
  it('gives the weeks the photos in the normal order, then nothing', () => {
    const plan = planWeeks(emptyFamilyState(), photos.slice(0, 2), NOW, 3)
    expect(plan.map((e) => [e.week, e.photo?.id ?? null, e.source])).toEqual([
      [NOW, 'a', 'regular'],
      [NEXT, 'b', 'regular'],
      [NIKOLAUS, null, null],
    ])
    expect(plan[2]?.occasion).toBe('nikolaus')
    expect(plan[0]?.started).toBe(false)
  })

  it('keeps the stored photo of a started week, even when it was deleted', () => {
    const family = emptyFamilyState()
    family.weekPhotos[NOW] = { photoId: 'c', cells: {}, updatedAt: T }
    family.weekPhotos[NEXT] = { photoId: 'gone', cells: {}, updatedAt: T }
    const plan = planWeeks(family, photos, NOW, 3)
    expect(plan.map((e) => [e.photo?.id ?? null, e.source, e.started])).toEqual([
      ['c', 'shown', true],
      [null, 'shown', true],
      ['a', 'regular', false],
    ])
  })

  it('lets a pin win over an occasion photo and the normal order', () => {
    const family = plans({ a: { occasion: 'nikolaus' }, d: { week: NIKOLAUS } })
    const plan = planWeeks(family, photos, NOW, 3)
    expect(plan.map((e) => [e.photo?.id, e.source])).toEqual([
      ['b', 'regular'],
      ['c', 'regular'],
      ['d', 'pinned'],
    ])
    // The occasion photo waits: nothing else takes its week, but the pin was first.
    expect(plan.every((e) => e.photo?.id !== 'a')).toBe(true)
  })

  it('uses a photo kept for the occasion when nothing is pinned', () => {
    const family = plans({ c: { occasion: 'nikolaus' } })
    expect(ids(family, 3)).toEqual(['a', 'b', 'c'])
    expect(planWeeks(family, photos, NOW, 3)[2]?.source).toBe('occasion')
  })

  it('uses every photo at most once', () => {
    const family = plans({ a: { occasion: 'nikolaus' }, b: { occasion: 'nikolaus' } })
    const used = ids(family, 8).filter(Boolean)
    expect(new Set(used).size).toBe(used.length)
  })

  it('treats a pin to a past week as normal again', () => {
    const family = plans({ b: { week: '2026-11-02' } })
    expect(regularPhotos(family, photos, NOW).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(ids(family, 2)).toEqual(['a', 'b'])
  })

  it('skips pinned photos in the normal order', () => {
    const family = plans({ a: { week: NIKOLAUS } })
    expect(regularPhotos(family, photos, NOW).map((p) => p.id)).toEqual(['b', 'c', 'd'])
    expect(ids(family, 3)).toEqual(['b', 'c', 'a'])
  })

  it('lets the older photo keep a week that two phones pinned', () => {
    const family = plans({ a: { week: NEXT }, b: { week: NEXT } })
    expect(ids(family, 3)).toEqual(['b', 'a', 'c'])
    expect(regularPhotos(family, photos, NOW).map((p) => p.id)).toEqual(['b', 'c', 'd'])
  })
})

describe('setPhotoWeek', () => {
  const { setPhotoWeek, setPhotoOccasion } = familyStore.getState().actions
  const week = (id: string) => familyStore.getState().family.photoOccasions[id]

  it('pins a photo and takes another photo of that week out of its pin', () => {
    setPhotoWeek('a', NEXT)
    expect(week('a')?.week).toBe(NEXT)
    setPhotoWeek('b', NEXT)
    expect(week('b')?.week).toBe(NEXT)
    expect(week('a')?.week).toBeUndefined()
    expect(familyStore.getState().dirty).toBe(true)
  })

  it('replaces an occasion mark and can take the pin off again', () => {
    setPhotoOccasion('c', 'christmas')
    setPhotoWeek('c', NIKOLAUS)
    expect(week('c')).toMatchObject({ occasion: null, week: NIKOLAUS })
    setPhotoWeek('c', null)
    expect(week('c')).toMatchObject({ occasion: null })
    expect(week('c')?.week).toBeUndefined()
  })

  it('leaves the pin of a photo whose week was already shown', () => {
    setPhotoWeek('d', '2026-12-07')
    familyStore.setState((s) => ({
      family: {
        ...s.family,
        weekPhotos: { '2026-12-07': { photoId: 'd', cells: {}, updatedAt: T } },
      },
    }))
    setPhotoWeek('e', '2026-12-07')
    expect(week('d')?.week).toBe('2026-12-07')
  })
})
