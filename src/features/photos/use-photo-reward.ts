import { useFamily } from '@/features/family/family-store'
import { weekKey } from '@/lib/dates'
import { usePhotos } from './photo-store'
import {
  daysWithFieldsLeft,
  fieldsLeft,
  needsNewPhotos,
  occasionWithoutPhoto,
  photoForWeek,
  photosEnabled,
} from './rewards'

/**
 * What the forest and the brushing page show about the reward photo of the current week. Without
 * uploaded photos everything is off, so the feature does not exist for the child.
 */
export function usePhotoReward(kidId: string | undefined, now: Date) {
  const family = useFamily()
  const photos = usePhotos()
  const week = weekKey(now)
  const enabled = photosEnabled(photos)
  const hasWeekPhoto = enabled && photoForWeek(family, photos, week, week) !== null
  const left = kidId && hasWeekPhoto ? fieldsLeft(family, kidId, week) : 0
  return {
    week,
    /** The current week has a photo the child can look at. */
    hasWeekPhoto,
    /** The child still has fields to uncover this week: the animal looks forward to them. */
    hasFieldsLeft: left > 0,
    /** Days of this week whose brushing still has unused fields. */
    daysWithFields: kidId && left > 0 ? daysWithFieldsLeft(family, kidId, week) : new Set<string>(),
    /** Parents: the next week has no photo left yet. */
    needsNewPhotos: needsNewPhotos(family, photos, week),
    /** Parents: next week's occasion has no photo kept for it yet. */
    occasionWithoutPhoto: occasionWithoutPhoto(family, photos, week),
  }
}
