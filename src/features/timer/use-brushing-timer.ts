import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { timerPosition, TOTAL_SECONDS } from './sections'

// Dev only: localStorage 'brush-speed' = 20 runs the two minutes in six seconds.
const SPEED = import.meta.env.DEV ? Number(localStorage.getItem('brush-speed') ?? '1') || 1 : 1

export type Phase = 'ready' | 'running' | 'paused' | 'done'

type Callbacks = {
  onSectionChange: (sectionIndex: number) => void
  onDone: () => void
  /** The page was hidden and the timer paused itself. */
  onAutoPause: () => void
}

/**
 * Two-minute timer based on the clock, not on counting ticks, so a slow phone does not stretch
 * the time. Pauses itself when the page is hidden (screen off, other app).
 */
export function useBrushingTimer({ onSectionChange, onDone, onAutoPause }: Callbacks) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [elapsedMs, setElapsedMs] = useState(0)
  const accumulated = useRef(0)
  const since = useRef<number | null>(null)
  const lastSection = useRef(0)
  const sectionChanged = useEffectEvent(onSectionChange)
  const finished = useEffectEvent(onDone)
  const autoPaused = useEffectEvent(onAutoPause)

  const read = () =>
    accumulated.current + (since.current == null ? 0 : (performance.now() - since.current) * SPEED)

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const ms = read()
      const pos = timerPosition(ms)
      setElapsedMs(ms)
      if (pos.done) {
        accumulated.current = TOTAL_SECONDS * 1000
        since.current = null
        setPhase('done')
        finished()
        return
      }
      if (pos.sectionIndex !== lastSection.current) {
        lastSection.current = pos.sectionIndex
        sectionChanged(pos.sectionIndex)
      }
    }, 200)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && since.current != null) {
        accumulated.current = read()
        since.current = null
        setElapsedMs(accumulated.current)
        setPhase('paused')
        autoPaused()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return {
    phase,
    elapsedMs,
    position: timerPosition(elapsedMs),
    start: () => {
      since.current = performance.now()
      setPhase('running')
    },
    pause: () => {
      accumulated.current = read()
      since.current = null
      setElapsedMs(accumulated.current)
      setPhase('paused')
    },
    restart: () => {
      accumulated.current = 0
      lastSection.current = 0
      since.current = performance.now()
      setElapsedMs(0)
      setPhase('running')
    },
    /** Elapsed seconds right now (for "stop early"). */
    elapsedSeconds: () => Math.floor(read() / 1000),
  }
}
