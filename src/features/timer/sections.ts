export const TOTAL_SECONDS = 120
export const SECTION_COUNT = 4
export const SECTION_SECONDS = TOTAL_SECONDS / SECTION_COUNT

/** Seen like in a mirror: the child's own left is on the left of the screen. */
export const SECTIONS = [
  { id: 'top-left', label: 'Oben links', jaw: 'top', side: 'left' },
  { id: 'top-right', label: 'Oben rechts', jaw: 'top', side: 'right' },
  { id: 'bottom-right', label: 'Unten rechts', jaw: 'bottom', side: 'right' },
  { id: 'bottom-left', label: 'Unten links', jaw: 'bottom', side: 'left' },
] as const

export type Section = (typeof SECTIONS)[number]

export type TimerPosition = {
  /** 0–3 while brushing, 4 when finished. */
  sectionIndex: number
  /** Seconds left in the current section (rounded up for display). */
  sectionRemaining: number
  /** Seconds left overall (rounded up for display). */
  totalRemaining: number
  /** 0–1 progress overall and inside the current section. */
  progress: number
  sectionProgress: number
  done: boolean
}

export function timerPosition(elapsedMs: number): TimerPosition {
  const elapsed = Math.min(Math.max(elapsedMs / 1000, 0), TOTAL_SECONDS)
  const done = elapsed >= TOTAL_SECONDS
  const sectionIndex = done ? SECTION_COUNT : Math.floor(elapsed / SECTION_SECONDS)
  const inSection = elapsed - sectionIndex * SECTION_SECONDS
  return {
    sectionIndex,
    sectionRemaining: done ? 0 : Math.ceil(SECTION_SECONDS - inSection),
    totalRemaining: Math.ceil(TOTAL_SECONDS - elapsed),
    progress: elapsed / TOTAL_SECONDS,
    sectionProgress: done ? 1 : inSection / SECTION_SECONDS,
    done,
  }
}

export function clockLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
