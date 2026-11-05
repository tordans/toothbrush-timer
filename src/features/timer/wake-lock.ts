// Keeps the screen on while brushing. Supported from Chrome 84 and iOS Safari 16.4; elsewhere
// this silently does nothing.

type Sentinel = { release: () => Promise<void> }
type WakeNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<Sentinel> } }

let sentinel: Sentinel | null = null

export async function keepScreenOn() {
  const nav = navigator as WakeNavigator
  if (!nav.wakeLock || sentinel) return
  try {
    sentinel = await nav.wakeLock.request('screen')
  } catch {
    sentinel = null
  }
}

export function allowScreenOff() {
  void sentinel?.release().catch(() => undefined)
  sentinel = null
}
