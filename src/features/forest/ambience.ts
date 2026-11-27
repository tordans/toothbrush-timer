/**
 * The quiet sound of the forest on the home page, generated with the Web Audio API (no files):
 * a faint, high rustle of leaves (no low rumble, which sounds like the sea) and now and then a
 * small sound. By day a few birds chirp; in the evening crickets sing and sometimes an owl calls.
 * Once in a while the child's animal hums a few notes of its own song (`hum`).
 *
 * Everything starts and ends softly (no sharp attacks), so it stays in the background.
 * It plays through the shared context of brushingAudio (see audio.ts), which also brings it back
 * after iOS took the sound.
 */

export type ForestMood = 'day' | 'evening'

type Out = { ctx: AudioContext; out: AudioNode }

/** Plays a few notes of the animal's song into `out`, starting at `t`. */
export type Hum = (v: Out, t: number) => void

export type Forest = {
  /** Fades out over `fade` seconds, then stops everything. */
  stop: (fade?: number) => void
}

const FADE = 2

/** Two seconds of white noise, looped for the wind. */
function noiseBuffer(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

/** A very slow wobble on `param`: `rate` in Hz, `depth` in the param's own unit. */
function wobble(ctx: AudioContext, param: AudioParam, rate: number, depth: number) {
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = rate
  const amount = ctx.createGain()
  amount.gain.value = depth
  lfo.connect(amount)
  amount.connect(param)
  lfo.start()
  return lfo
}

/** Noise through a filter that swells slowly: wind (low) or rustling leaves (high). */
function wind(v: Out, noise: AudioBuffer, type: BiquadFilterType, freq: number, level: number) {
  const { ctx } = v
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = 0.6
  const gain = ctx.createGain()
  gain.gain.value = level
  src.connect(filter)
  filter.connect(gain)
  gain.connect(v.out)
  // Rates a little apart, so the swell never repeats exactly.
  const lfos = [
    wobble(ctx, filter.frequency, 0.05 + Math.random() * 0.04, freq * 0.35),
    wobble(ctx, gain.gain, 0.03 + Math.random() * 0.03, level * 0.6),
  ]
  src.start(ctx.currentTime, Math.random() * 2)
  return [src, ...lfos]
}

/** One soft tone with a gentle rise and fall; `glide` bends the pitch to `to` Hz. */
function tone(v: Out, from: number, to: number, t: number, length: number, level: number) {
  const { ctx } = v
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + length)
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(level, t + length * 0.35)
  env.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(env)
  env.connect(v.out)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

/** A small bird: two to four short rising chirps. */
function bird(v: Out, t: number) {
  const base = 2600 + Math.random() * 1400
  const chirps = 2 + Math.floor(Math.random() * 3)
  for (let i = 0; i < chirps; i++) {
    const f = base * (1 + (Math.random() - 0.5) * 0.12)
    tone(v, f, f * 1.25, t + i * 0.14, 0.09, 0.03)
  }
}

/** A cricket: a few quick soft pulses on one high note, sung twice. */
function cricket(v: Out, t: number) {
  const f = 4200 + Math.random() * 600
  for (let rep = 0; rep < 2; rep++) {
    for (let i = 0; i < 4; i++) tone(v, f, f, t + rep * 0.5 + i * 0.05, 0.04, 0.012)
  }
}

/** An owl far away: a low "hoo – hoo". */
function owl(v: Out, t: number) {
  tone(v, 400, 360, t, 0.5, 0.035)
  tone(v, 390, 350, t + 0.7, 0.7, 0.03)
}

/** Starts the forest into `v.out` and returns how to stop it. */
export function playForest(v: Out, mood: ForestMood, hum: Hum): Forest {
  const { ctx } = v
  const out = ctx.createGain()
  out.gain.setValueAtTime(0.0001, ctx.currentTime)
  out.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + FADE)
  out.connect(v.out)
  const here = { ctx, out }

  const noise = noiseBuffer(ctx)
  const evening = mood === 'evening'
  const loops = [
    ...wind(here, noise, 'bandpass', evening ? 900 : 1200, 0.025),
    ...wind(here, noise, 'bandpass', evening ? 2600 : 3600, evening ? 0.02 : 0.03),
  ]

  // Sparse animal sounds at random times; a timer is fine, they need not be exact.
  let timer: ReturnType<typeof setTimeout> | undefined
  // The animal hums about every fifth sound, never twice in a row.
  let hummed = true
  const next = () => {
    const wait = evening ? 5 + Math.random() * 8 : 4 + Math.random() * 9
    timer = setTimeout(() => {
      const t = ctx.currentTime + 0.05
      if (!hummed && Math.random() < 0.2) {
        hum(here, t)
        hummed = true
      } else {
        hummed = false
        if (!evening) bird(here, t)
        else if (Math.random() < 0.2) owl(here, t)
        else cricket(here, t)
      }
      next()
    }, wait * 1000)
  }
  next()

  return {
    stop(fade = FADE) {
      clearTimeout(timer)
      const now = ctx.currentTime
      out.gain.cancelScheduledValues(now)
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), now)
      out.gain.exponentialRampToValueAtTime(0.0001, now + fade)
      for (const node of loops) {
        try {
          node.stop(now + fade + 0.05)
        } catch {
          // The context is already closed: nothing to stop.
        }
      }
    },
  }
}

const KEY = 'forest-sound'

/** Whether the forest sound is on, per device. On unless switched off. */
export function readForestSoundOn() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveForestSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Private mode or full storage: the choice holds until the page reloads.
  }
}
