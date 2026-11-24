import { describe, expect, it } from 'vitest'
import { emptyFamilyState, type FamilyState } from '@/features/family/schema'
import type { Photo } from '@/features/photos/api'
import { easterSunday, nextWeekOf, occasionsOfWeek } from '@/features/photos/occasions'
import {
  needsNewPhotos,
  occasionWithoutPhoto,
  photoForWeek,
  regularPhotos,
} from '@/features/photos/rewards'

const T = '2026-11-10T08:00:00.000Z'

const photo = (id: string, created: string): Photo => ({
  id,
  width: 1024,
  height: 1024,
  bytes: 1,
  type: 'image/webp',
  created_at: created,
})

function kept(marks: Record<string, string>): FamilyState {
  const family = emptyFamilyState()
  for (const [id, occasion] of Object.entries(marks)) {
    family.photoOccasions[id] = { occasion, updatedAt: T }
  }
  return family
}

describe('occasion weeks', () => {
  it('calculates Easter Sunday', () => {
    expect(easterSunday(2026)).toBe('2026-04-05')
    expect(easterSunday(2027)).toBe('2027-03-28')
    expect(easterSunday(2028)).toBe('2028-04-16')
  })

  it('finds the occasions of a week, the most important first', () => {
    expect(occasionsOfWeek('2026-11-16')).toEqual([])
    // Nikolaus is on Sunday 6 Dec 2026, in the first Advent week.
    expect(occasionsOfWeek('2026-11-30')).toEqual(['nikolaus', 'advent'])
    expect(occasionsOfWeek('2026-12-07')).toEqual(['advent'])
    expect(occasionsOfWeek('2026-12-21')).toEqual(['christmas', 'advent'])
    expect(occasionsOfWeek('2026-12-28')).toEqual(['new-year'])
    // Easter Sunday ends its week.
    expect(occasionsOfWeek('2027-03-22')).toEqual(['easter'])
    expect(occasionsOfWeek('2027-10-25')).toEqual(['halloween'])
  })

  it('finds the next week of an occasion', () => {
    expect(nextWeekOf('christmas', '2026-11-16')).toBe('2026-12-21')
    expect(nextWeekOf('advent', '2026-11-16')).toBe('2026-12-07')
  })
})

describe('photos kept for an occasion', () => {
  const photos = [
    photo('xmas', '2026-11-01T00:00:00.000Z'),
    photo('old', '2026-11-02T00:00:00.000Z'),
    photo('wichtel', '2026-11-03T00:00:00.000Z'),
    photo('nikolaus', '2026-11-04T00:00:00.000Z'),
  ]
  const family = kept({ xmas: 'christmas', wichtel: 'advent', nikolaus: 'nikolaus' })

  it('waits for its week and is then preferred', () => {
    expect(regularPhotos(family, photos, '2026-11-16').map((p) => p.id)).toEqual(['old'])
    expect(photoForWeek(family, photos, '2026-11-16', '2026-11-16')?.photo.id).toBe('old')
    expect(photoForWeek(family, photos, '2026-11-30', '2026-11-30')?.photo.id).toBe('nikolaus')
    expect(photoForWeek(family, photos, '2026-12-07', '2026-12-07')?.photo.id).toBe('wichtel')
    expect(photoForWeek(family, photos, '2026-12-21', '2026-12-21')?.photo.id).toBe('xmas')
  })

  it('goes back into the normal order when the mark is taken off', () => {
    const unmarked = kept({ xmas: 'christmas' })
    unmarked.photoOccasions.xmas = { occasion: null, updatedAt: T }
    expect(photoForWeek(unmarked, photos, '2026-11-16', '2026-11-16')?.photo.id).toBe('xmas')
  })

  it('reminds the parents a week ahead when an occasion has no photo', () => {
    expect(occasionWithoutPhoto(family, photos, '2026-11-23')).toBeNull()
    expect(occasionWithoutPhoto(emptyFamilyState(), photos, '2026-11-23')).toBe('nikolaus')
    expect(occasionWithoutPhoto(emptyFamilyState(), photos, '2026-11-09')).toBeNull()
    expect(occasionWithoutPhoto(emptyFamilyState(), [], '2026-11-23')).toBeNull()
  })

  it('does not count kept photos as photos for normal weeks', () => {
    expect(needsNewPhotos(family, photos, '2026-11-16')).toBe(true)
    expect(needsNewPhotos(emptyFamilyState(), photos, '2026-11-16')).toBe(false)
  })
})
