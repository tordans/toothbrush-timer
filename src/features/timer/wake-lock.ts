// Keeps the screen on while brushing. Supported from Chrome 84 and iOS Safari 16.4; elsewhere
// this silently does nothing. The browser drops the lock by itself when the page is hidden, so
// keepScreenOn() is called again on every resume.

type Sentinel = {
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}
type WakeNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<Sentinel> } }

let sentinel: Sentinel | null = null
/** Whether the screen should stay on right now (a request may still be pending). */
let wanted = false

export async function keepScreenOn() {
  const nav = navigator as WakeNavigator
  wanted = true
  if (!nav.wakeLock || sentinel) return
  try {
    const lock = await nav.wakeLock.request('screen')
    if (!wanted) {
      // allowScreenOff() was called while the request was pending
      void lock.release().catch(() => undefined)
      return
    }
    sentinel = lock
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null
    })
  } catch {
    sentinel = null
  }
}

export function allowScreenOff() {
  wanted = false
  void sentinel?.release().catch(() => undefined)
  sentinel = null
}
