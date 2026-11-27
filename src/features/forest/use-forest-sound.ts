import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Animal } from '@/features/family/schema'
import { brushingAudio } from '@/features/timer/audio'
import { readForestSoundOn, saveForestSoundOn, type ForestMood } from './ambience'

function subscribeVisibility(listener: () => void) {
  document.addEventListener('visibilitychange', listener)
  return () => document.removeEventListener('visibilitychange', listener)
}

/**
 * The forest sound of the home page: plays while the page is shown and the sound is on, fades out
 * when the page is left or hidden. iOS only allows sound after a tap, so `tap` goes on the page.
 * Now and then `animal` hums a bit of its song.
 */
export function useForestSound(mood: ForestMood, animal: Animal | undefined) {
  const [on, setOn] = useState(readForestSoundOn)
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === 'visible',
  )

  useEffect(() => {
    if (animal) brushingAudio.setAnimal(animal)
  }, [animal])

  useEffect(() => {
    if (!on || !visible) return
    brushingAudio.startForest(mood)
    return () => brushingAudio.stopForest()
  }, [on, visible, mood])

  const toggle = () => {
    setOn(!on)
    saveForestSoundOn(!on)
    if (!on) brushingAudio.unlock()
  }
  /** The first tap on the page makes the sound; later taps bring it back after an interruption. */
  const tap = () => {
    if (on) brushingAudio.unlock()
  }
  return { on, toggle, tap }
}
