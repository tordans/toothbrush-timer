import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { BrushingAudio } from '@/features/timer/audio'

/** An audio node or param that accepts any call and setting. */
function fakeNode(): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  return new Proxy(params, {
    get(target, key: string) {
      if (key in target) return target[key]
      if (['connect', 'disconnect', 'start', 'stop'].includes(key)) return () => undefined
      if (key.endsWith('AtTime') || key === 'cancelScheduledValues') return () => undefined
      if (key === 'getChannelData') return () => new Float32Array(4800)
      target[key] = fakeNode()
      return target[key]
    },
  })
}

class FakeContext extends EventTarget {
  static made: FakeContext[] = []
  state: AudioContextState | 'interrupted' = 'running'
  currentTime = 0
  sampleRate = 48_000
  destination = fakeNode()
  /** What the next resume() does. */
  resumeResult: 'run' | 'stay' | 'reject' = 'run'
  resume = vi.fn(async () => {
    if (this.resumeResult === 'reject') throw new Error('refused')
    if (this.resumeResult === 'run') this.setState('running')
  })
  close = vi.fn(async () => this.setState('closed'))
  oscillators = 0

  constructor() {
    super()
    FakeContext.made.push(this)
  }

  setState(state: FakeContext['state']) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }

  createGain = fakeNode
  createDelay = fakeNode
  createBiquadFilter = fakeNode
  createDynamicsCompressor = fakeNode
  createBufferSource = fakeNode
  createBuffer = fakeNode
  createOscillator = () => {
    this.oscillators++
    return fakeNode()
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

let doc: EventTarget & { visibilityState: string }
let win: EventTarget & { AudioContext: typeof FakeContext }
let nav: { audioSession?: { type: string } }

beforeEach(() => {
  FakeContext.made = []
  doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  win = Object.assign(new EventTarget(), { AudioContext: FakeContext })
  nav = { audioSession: { type: 'auto' } }
  vi.stubGlobal('document', doc)
  vi.stubGlobal('window', win)
  vi.stubGlobal('navigator', nav)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const latest = () => FakeContext.made.at(-1)!

describe('BrushingAudio after another app took the sound', () => {
  test('the first tap makes a context with the playback audio session', () => {
    const audio = new BrushingAudio()
    audio.unlock()
    expect(FakeContext.made).toHaveLength(1)
    expect(nav.audioSession?.type).toBe('playback')
  })

  test('coming back to the page resumes an interrupted context', async () => {
    const audio = new BrushingAudio()
    audio.unlock()
    const ctx = latest()
    ctx.resumeResult = 'stay'
    ctx.setState('interrupted')
    ctx.resume.mockClear()
    ctx.resumeResult = 'run'
    doc.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(ctx.resume).toHaveBeenCalled()
    expect(ctx.state).toBe('running')
    expect(FakeContext.made).toHaveLength(1)
  })

  test('a tap resumes an interrupted context (the old code only resumed "suspended")', async () => {
    const audio = new BrushingAudio()
    audio.unlock()
    const ctx = latest()
    ctx.resumeResult = 'stay'
    ctx.setState('interrupted')
    ctx.resumeResult = 'run'
    doc.dispatchEvent(new Event('pointerdown'))
    await flush()
    expect(ctx.state).toBe('running')
    expect(FakeContext.made).toHaveLength(1)
  })

  test('if resume fails on a tap, a fresh context replaces the old one', async () => {
    const audio = new BrushingAudio()
    audio.unlock()
    const old = latest()
    old.resumeResult = 'reject'
    old.state = 'interrupted'
    audio.unlock()
    await flush()
    expect(FakeContext.made).toHaveLength(2)
    expect(old.close).toHaveBeenCalled()
  })

  test('if the context stays stopped after resume, a fresh one replaces it', async () => {
    const audio = new BrushingAudio()
    audio.unlock()
    const old = latest()
    old.resumeResult = 'stay'
    old.state = 'suspended'
    audio.unlock()
    audio.unlock() // the same tap reaches the page listener and the button
    await flush()
    expect(FakeContext.made).toHaveLength(2)
  })

  test('a closed context is replaced on the next tap', () => {
    const audio = new BrushingAudio()
    audio.unlock()
    latest().state = 'closed'
    audio.unlock()
    expect(FakeContext.made).toHaveLength(2)
  })

  test('music goes on in the fresh context, and the gong plays there', async () => {
    vi.useFakeTimers()
    try {
      const audio = new BrushingAudio()
      audio.unlock()
      audio.startMusic()
      const old = latest()
      expect(old.oscillators).toBeGreaterThan(0)
      old.resumeResult = 'reject'
      old.state = 'interrupted'
      audio.unlock()
      await vi.advanceTimersByTimeAsync(0)
      const fresh = latest()
      expect(fresh).not.toBe(old)
      fresh.currentTime = 1
      await vi.advanceTimersByTimeAsync(100)
      expect(fresh.oscillators).toBeGreaterThan(0)
      const before = fresh.oscillators
      audio.finishMelody()
      expect(fresh.oscillators).toBeGreaterThan(before)
      audio.stopMusic()
    } finally {
      vi.useRealTimers()
    }
  })

  test('turning music off and on again while interrupted resumes the context', async () => {
    const audio = new BrushingAudio()
    audio.unlock()
    audio.startMusic()
    const ctx = latest()
    ctx.state = 'interrupted'
    audio.stopMusic()
    audio.unlock()
    audio.startMusic()
    await flush()
    expect(ctx.state).toBe('running')
    audio.stopMusic()
  })
})
