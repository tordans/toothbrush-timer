import { useSyncExternalStore } from 'react'

// One shared clock that ticks every 30 seconds: enough for "today" and "morning or evening".
let now = new Date()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    timer = setInterval(() => {
      now = new Date()
      for (const l of listeners) l()
    }, 30_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function useNow(): Date {
  return useSyncExternalStore(subscribe, () => now)
}
