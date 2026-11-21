import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { readForestSoundOn, saveForestSoundOn } from '@/features/forest/ambience'
import { BrushingAudio } from '@/features/timer/audio'

/** An audio node or param that accepts any call and setting. */
function fakeNode(): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  return new Proxy(params, {
    get(target, key: string | symbol) {
      if (typeof key === 'symbol') return undefined
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
  suspend = vi.fn(async () => this.setState('suspended'))
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
  bufferSources = 0
  createBufferSource = () => {
    this.bufferSources++
    return fakeNode()
  }
  createBuffer = fakeNode
  createOscillator = () => {
    this.oscillators++
    return fakeNode()
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

let doc: EventTarget & { visibilityState: string }
let win: EventTarget & { AudioContext: typeof FakeContext }
type FakeMedia = {
  playbackState: string
  handlers: Map<string, (() => void) | null>
  setActionHandler: (action: string, handler: (() => void) | null) => void
}
let nav: { audioSession?: { type: string }; mediaSession?: FakeMedia }

beforeEach(() => {
  FakeContext.made = []
  doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  win = Object.assign(new EventTarget(), { AudioContext: FakeContext })
  const handlers = new Map<string, (() => void) | null>()
  nav = {
    audioSession: { type: 'auto' },
    mediaSession: {
      playbackState: 'none',
      handlers,
      setActionHandler: (action, handler) => handlers.set(action, handler),
    },
  }
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
    audio.startBrushing(false)
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

describe('forest sound on the home page', () => {
  test('waits for the first tap, then plays in the new context', () => {
    const audio = new BrushingAudio()
    audio.startForest('day')
    expect(FakeContext.made).toHaveLength(0)
    audio.unlock()
    expect(latest().bufferSources).toBeGreaterThan(0)
  })

  test('birds chirp now and then, and stop with the forest', () => {
    vi.useFakeTimers()
    try {
      const audio = new BrushingAudio()
      audio.unlock()
      audio.startForest('day')
      const ctx = latest()
      const wind = ctx.oscillators
      vi.advanceTimersByTime(15_000)
      expect(ctx.oscillators).toBeGreaterThan(wind)
      audio.stopForest()
      const after = ctx.oscillators
      vi.advanceTimersByTime(60_000)
      expect(ctx.oscillators).toBe(after)
    } finally {
      vi.useRealTimers()
    }
  })

  test('the same mood twice does not start a second forest; a new mood does', () => {
    const audio = new BrushingAudio()
    audio.unlock()
    audio.startForest('day')
    const ctx = latest()
    const first = ctx.bufferSources
    audio.startForest('day')
    expect(ctx.bufferSources).toBe(first)
    audio.startForest('evening')
    expect(ctx.bufferSources).toBe(first * 2)
    audio.stopForest()
  })

  test('the forest comes back in a fresh context', () => {
    const audio = new BrushingAudio()
    audio.unlock()
    audio.startForest('evening')
    latest().state = 'closed'
    audio.unlock()
    expect(FakeContext.made).toHaveLength(2)
    expect(latest().bufferSources).toBeGreaterThan(0)
    audio.stopForest()
  })

  test('a stopped forest does not come back with a fresh context', () => {
    const audio = new BrushingAudio()
    audio.unlock()
    audio.startForest('day')
    audio.stopForest()
    latest().state = 'closed'
    audio.unlock()
    expect(latest().bufferSources).toBe(0)
  })
})

describe('forest sound setting', () => {
  test('is on by default and remembers off and on', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    })
    expect(readForestSoundOn()).toBe(true)
    saveForestSoundOn(false)
    expect(readForestSoundOn()).toBe(false)
    saveForestSoundOn(true)
    expect(readForestSoundOn()).toBe(true)
  })

  test('without storage it stays on and saving does not throw', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(readForestSoundOn()).toBe(true)
    expect(() => saveForestSoundOn(false)).not.toThrow()
  })
})

describe('silence when nothing sounds', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('after brushing is done and the last bell faded, the context is suspended', () => {
    const audio = new BrushingAudio()
    audio.startBrushing(true)
    const ctx = latest()
    expect(nav.mediaSession?.playbackState).toBe('playing')
    audio.stopBrushing()
    audio.finishMelody()
    vi.advanceTimersByTime(3000)
    expect(ctx.suspend).not.toHaveBeenCalled() // the bells still ring
    ctx.currentTime = 10
    vi.advanceTimersByTime(10_000)
    expect(ctx.suspend).toHaveBeenCalled()
    expect(ctx.state).toBe('suspended')
    expect(nav.mediaSession?.playbackState).toBe('none')
  })

  test('a context suspended on purpose is not woken by the page, only by new sound', () => {
    const audio = new BrushingAudio()
    audio.startBrushing(true)
    const ctx = latest()
    audio.stopBrushing()
    vi.advanceTimersByTime(5000)
    expect(ctx.state).toBe('suspended')
    ctx.resume.mockClear()
    doc.dispatchEvent(new Event('visibilitychange'))
    win.dispatchEvent(new Event('focus'))
    doc.dispatchEvent(new Event('pointerdown'))
    audio.unlock() // a tap on the page while nothing should sound
    expect(ctx.resume).not.toHaveBeenCalled()
    audio.startForest('day')
    expect(ctx.resume).toHaveBeenCalled()
    audio.stopForest()
  })

  test('the session is "playback" while brushing and "ambient" for the forest and after', () => {
    const audio = new BrushingAudio()
    audio.startForest('day')
    audio.unlock()
    expect(nav.audioSession?.type).toBe('ambient')
    audio.stopForest()
    audio.startBrushing(false)
    expect(nav.audioSession?.type).toBe('playback')
    audio.stopBrushing()
    audio.switchJingle() // a jingle still playing keeps it
    expect(nav.audioSession?.type).toBe('playback')
    latest().currentTime = 10
    vi.advanceTimersByTime(10_000)
    expect(nav.audioSession?.type).toBe('ambient')
  })

  test('Now Playing buttons are wired while brushing and cleared after', () => {
    const audio = new BrushingAudio()
    const pause = vi.fn()
    audio.setMediaControls({ play: vi.fn(), pause })
    nav.mediaSession?.handlers.get('pause')?.()
    expect(pause).toHaveBeenCalled()
    audio.setMediaControls(null)
    expect(nav.mediaSession?.handlers.get('play')).toBeNull()
    expect(nav.mediaSession?.handlers.get('pause')).toBeNull()
  })
})
