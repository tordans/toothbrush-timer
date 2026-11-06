/** Brushing time without the short breaks between corners. */
export const TOTAL_SECONDS = 120
const SECTION_COUNT = 4
const SECTION_SECONDS = TOTAL_SECONDS / SECTION_COUNT
/** Short break between two corners: the animal waves, a jingle plays, then it goes on. */
const SWITCH_SECONDS = 3
/** Full run: four corners plus three breaks. */
export const TIMELINE_SECONDS = TOTAL_SECONDS + (SECTION_COUNT - 1) * SWITCH_SECONDS

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

export function timerPosition(elapsedMs: number): TimerPosition {
  const t = Math.min(Math.max(elapsedMs / 1000, 0), TIMELINE_SECONDS)
  if (t >= TIMELINE_SECONDS) {
    return {
      sectionIndex: SECTION_COUNT,
      switching: false,
      sectionProgress: 1,
      brushed: TOTAL_SECONDS,
      totalRemaining: 0,
      done: true,
    }
  }
  const slot = SECTION_SECONDS + SWITCH_SECONDS
  const i = Math.floor(t / slot)
  const inSlot = t - i * slot
  if (inSlot < SECTION_SECONDS) {
    const brushed = i * SECTION_SECONDS + inSlot
    return {
      sectionIndex: i,
      switching: false,
      sectionProgress: inSlot / SECTION_SECONDS,
      brushed,
      totalRemaining: Math.ceil(TOTAL_SECONDS - brushed),
      done: false,
    }
  }
  const brushed = (i + 1) * SECTION_SECONDS
  return {
    sectionIndex: i + 1,
    switching: true,
    sectionProgress: 0,
    brushed,
    totalRemaining: Math.ceil(TOTAL_SECONDS - brushed),
    done: false,
  }
}

export function clockLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
