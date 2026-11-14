import type { Toothbrush } from '@/features/family/schema'

const SECTION_COUNT = 4
/** Short break between two corners: the animal waves, a jingle plays, then it goes on. */
const SWITCH_SECONDS = 3

/** Brushing time without the breaks: 2 minutes with an electric brush, 3 by hand. */
export function brushingSeconds(toothbrush: Toothbrush | undefined): number {
  return toothbrush === 'manual' ? 180 : 120
}

/** Full run: four corners plus three breaks. */
export function timelineSeconds(totalSeconds: number): number {
  return totalSeconds + (SECTION_COUNT - 1) * SWITCH_SECONDS
}

/**
 * Seen like in a mirror: the child's own left is on the left of the screen. The order goes
 * clockwise around the dial, starting at nine o'clock.
 */
export const SECTIONS = [
  { id: 'top-left', label: 'Oben links', jaw: 'top', side: 'left' },
  { id: 'top-right', label: 'Oben rechts', jaw: 'top', side: 'right' },
  { id: 'bottom-right', label: 'Unten rechts', jaw: 'bottom', side: 'right' },
  { id: 'bottom-left', label: 'Unten links', jaw: 'bottom', side: 'left' },
] as const

export type TimerPosition = {
  /** 0–3: the corner being brushed, or during a break the corner that comes next. 4 = done. */
  sectionIndex: number
  /** True during the short break before `sectionIndex`. */
  switching: boolean
  /** 0–1 inside the current corner (0 during a break). */
  sectionProgress: number
  /** Seconds actually brushed so far (breaks do not count). */
  brushed: number
  /** Brushing seconds left (rounded up for display). */
  totalRemaining: number
  done: boolean
}

export function timerPosition(elapsedMs: number, totalSeconds = 120): TimerPosition {
  const sectionSeconds = totalSeconds / SECTION_COUNT
  const timeline = timelineSeconds(totalSeconds)
  const t = Math.min(Math.max(elapsedMs / 1000, 0), timeline)
  if (t >= timeline) {
    return {
      sectionIndex: SECTION_COUNT,
      switching: false,
      sectionProgress: 1,
      brushed: totalSeconds,
      totalRemaining: 0,
      done: true,
    }
  }
  const slot = sectionSeconds + SWITCH_SECONDS
  const i = Math.floor(t / slot)
  const inSlot = t - i * slot
  if (inSlot < sectionSeconds) {
    const brushed = i * sectionSeconds + inSlot
    return {
      sectionIndex: i,
      switching: false,
      sectionProgress: inSlot / sectionSeconds,
      brushed,
      totalRemaining: Math.ceil(totalSeconds - brushed),
      done: false,
    }
  }
  const brushed = (i + 1) * sectionSeconds
  return {
    sectionIndex: i + 1,
    switching: true,
    sectionProgress: 0,
    brushed,
    totalRemaining: Math.ceil(totalSeconds - brushed),
    done: false,
  }
}

export function clockLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
