/**
 * Three songs for brushing, played live with the Web Audio API (no audio files). Each one loops
 * a four-bar chord progression in C major at a walking tempo: lively enough to keep going, but
 * no fast drums and no sharp sounds. Each song has its own corner jingle, played with the same
 * instrument and on its beat, so the jingle sounds like part of the song.
 */

export const MUSIC_STYLES = ['spieluhr', 'marimba', 'lagerfeuer'] as const
export type MusicStyle = (typeof MUSIC_STYLES)[number]

export const MUSIC_STYLE_LABELS: Record<MusicStyle, string> = {
  spieluhr: 'Spieluhr',
  marimba: 'Marimba',
  lagerfeuer: 'Lagerfeuer',
}

/** MIDI note number to Hz (69 = A4 = 440 Hz). */
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

/** Chords as MIDI notes; the first one is the bass root (octave 3). */
const CHORDS = {
  C: [48, 60, 64, 67],
  Am: [45, 57, 60, 64],
  F: [41, 57, 60, 65],
  G: [43, 55, 59, 62],
} as const
type Chord = keyof typeof CHORDS

export type Voices = {
  ctx: AudioContext
  /** Dry signal. */
  out: AudioNode
  /** Soft echo, for melodies. */
  echo: AudioNode
}

/** One volume envelope: quick rise, then exponential fade. */
function envelope(v: Voices, t: number, level: number, attack: number, decay: number) {
  const env = v.ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(level, t + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  return env
}

function sine(v: Voices, freq: number, t: number, stop: number, to: AudioNode) {
  const osc = v.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq
  osc.connect(to)
  osc.start(t)
  osc.stop(stop)
}

/** Music box tine: pure tone with a faint metallic overtone. */
function musicBox(v: Voices, midi: number, t: number, level: number, echo = true) {
  const f = hz(midi)
  const body = envelope(v, t, level, 0.005, 1.4)
  const shine = envelope(v, t, level * 0.25, 0.003, 0.25)
  sine(v, f, t, t + 1.5, body)
  sine(v, f * 4, t, t + 0.3, shine)
  for (const env of [body, shine]) {
    env.connect(v.out)
    if (echo) env.connect(v.echo)
  }
}

/** Wooden bar: a short, round tone with a quickly fading fourth partial. */
function marimba(v: Voices, midi: number, t: number, level: number, echo = false) {
  const f = hz(midi)
  const body = envelope(v, t, level, 0.004, 0.55)
  const knock = envelope(v, t, level * 0.35, 0.002, 0.08)
  sine(v, f, t, t + 0.6, body)
  sine(v, f * 4, t, t + 0.1, knock)
  for (const env of [body, knock]) {
    env.connect(v.out)
    if (echo) env.connect(v.echo)
  }
}

/** Plucked nylon string: a bright tone whose brightness fades quickly, like a ukulele. */
function pluck(v: Voices, midi: number, t: number, level: number, echo = false) {
  const osc = v.ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = hz(midi)
  const tone = v.ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.setValueAtTime(2600, t)
  tone.frequency.exponentialRampToValueAtTime(500, t + 0.35)
  const env = envelope(v, t, level, 0.004, 0.7)
  osc.connect(tone)
  tone.connect(env)
  env.connect(v.out)
  if (echo) env.connect(v.echo)
  osc.start(t)
  osc.stop(t + 0.75)
}

/** Soft round bass. */
function bass(v: Voices, midi: number, t: number, level: number, length = 0.5) {
  const osc = v.ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = hz(midi)
  const env = envelope(v, t, level, 0.01, length)
  osc.connect(env)
  env.connect(v.out)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

let noise: AudioBuffer | null = null
/** Very quiet shaker: a puff of high noise. */
function shaker(v: Voices, t: number, level: number) {
  if (!noise || noise.sampleRate !== v.ctx.sampleRate) {
    noise = v.ctx.createBuffer(1, v.ctx.sampleRate * 0.1, v.ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const src = v.ctx.createBufferSource()
  src.buffer = noise
  const high = v.ctx.createBiquadFilter()
  high.type = 'highpass'
  high.frequency.value = 7000
  const env = envelope(v, t, level, 0.01, 0.06)
  src.connect(high)
  high.connect(env)
  env.connect(v.out)
  src.start(t)
  src.stop(t + 0.1)
}

/** A soft thump, like a hand on a box drum. */
function thump(v: Voices, t: number, level: number) {
  const osc = v.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, t)
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.12)
  const env = envelope(v, t, level, 0.005, 0.16)
  osc.connect(env)
  env.connect(v.out)
  osc.start(t)
  osc.stop(t + 0.2)
}

type Song = {
  /** Eighth notes per minute. */
  eighthsPerMinute: number
  progression: Chord[]
  /** Plays everything that falls on one eighth note. `step` counts from the song's start. */
  step: (v: Voices, step: number, t: number) => void
  /** Short rising phrase for a new corner, in the song's instrument. */
  jingle: (v: Voices, t: number, eighth: number) => void
}

const chordAt = (song: Pick<Song, 'progression'>, step: number): Chord =>
  song.progression[Math.floor(step / 8) % song.progression.length] ?? 'C'

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!

// Spieluhr: a fixed, singable tune over C – Am – F – G, in the form A A B A.
const R = null
const TUNE_A = [
  [76, R, 79, R, 76, 74, 72, R],
  [69, R, 72, R, 76, R, 74, R],
  [72, R, 69, R, 72, 74, 76, R],
  [74, R, 71, R, 74, R, R, R],
]
const TUNE_B = [
  [79, R, 81, 79, 76, R, 79, R],
  [81, R, 84, R, 81, 79, 76, R],
  [77, R, 76, 74, 72, R, 74, R],
  [74, 76, 74, 71, 67, R, R, R],
]
const TUNE = [...TUNE_A, ...TUNE_A, ...TUNE_B, ...TUNE_A]

const spieluhr: Song = {
  eighthsPerMinute: 184,
  progression: ['C', 'Am', 'F', 'G'],
  step(v, step, t) {
    const bar = Math.floor(step / 8)
    const beat = step % 8
    const chord = CHORDS[chordAt(this, step)]
    const note = TUNE[bar % TUNE.length]?.[beat]
    if (note != null) musicBox(v, note, t, 0.13)
    if (beat === 0) bass(v, chord[0] + 12, t, 0.1, 0.9)
    if (beat === 4) bass(v, chord[3] - 12, t, 0.07, 0.7)
    // A quiet broken chord under the tune.
    if (beat === 2 || beat === 6) musicBox(v, chord[beat === 2 ? 1 : 2], t, 0.04, false)
  },
  jingle(v, t, eighth) {
    ;[72, 76, 79, 84].forEach((n, i) => musicBox(v, n, t + i * eighth, 0.2))
  },
}

// Marimba: bouncing broken chords over C – G – Am – F, a syncopated bass and a whisper of shaker.
const ARPEGGIO = [1, 2, 3, 2, 1, 2, 3, 2]
const marimbaSong: Song = {
  eighthsPerMinute: 200,
  progression: ['C', 'G', 'Am', 'F'],
  step(v, step, t) {
    const beat = step % 8
    const chord = CHORDS[chordAt(this, step)]
    const tone = chord[ARPEGGIO[beat] ?? 1] ?? chord[1]
    // Every second time through, the top notes jump up an octave now and then.
    const lift = Math.floor(step / 32) % 2 === 1 && beat % 4 === 2 && Math.random() < 0.6 ? 12 : 0
    marimba(v, tone + lift, t, beat % 2 === 0 ? 0.12 : 0.08)
    if (beat === 0 || beat === 3) bass(v, chord[0], t, 0.13, 0.4)
    if (beat === 4) bass(v, chord[0] + 7, t, 0.11, 0.4)
    if (beat % 2 === 1) shaker(v, t, 0.025)
    // A short tune on top in the second half of the loop.
    if (Math.floor(step / 32) % 2 === 1 && beat === 0) {
      marimba(v, pick([chord[1], chord[2], chord[3]]) + 12, t, 0.1, true)
    }
  },
  jingle(v, t, eighth) {
    ;[72, 76, 79].forEach((n, i) => marimba(v, n, t + i * eighth, 0.2, true))
    marimba(v, 84, t + 3 * eighth, 0.24, true)
    marimba(v, 79, t + 3 * eighth, 0.12)
  },
}

// Lagerfeuer: strummed ukulele chords over C – F – Am – G, box-drum thumps, a whistled tune.
const UKULELE: Record<Chord, number[]> = {
  C: [67, 60, 64, 72],
  F: [69, 65, 69, 72],
  Am: [69, 60, 64, 69],
  G: [67, 62, 67, 71],
}
// Down, -, down, up, -, up, down, up
const STRUM: ('down' | 'up' | null)[] = ['down', null, 'down', 'up', null, 'up', 'down', 'up']

function whistle(v: Voices, midi: number, t: number, length: number) {
  const osc = v.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = hz(midi)
  const vibrato = v.ctx.createOscillator()
  vibrato.frequency.value = 5
  const depth = v.ctx.createGain()
  depth.gain.value = hz(midi) * 0.006
  vibrato.connect(depth)
  depth.connect(osc.frequency)
  const env = v.ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.linearRampToValueAtTime(0.06, t + 0.06)
  env.gain.setValueAtTime(0.06, t + length * 0.7)
  env.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(env)
  env.connect(v.out)
  env.connect(v.echo)
  for (const o of [osc, vibrato]) {
    o.start(t)
    o.stop(t + length + 0.05)
  }
}

const lagerfeuer: Song = {
  eighthsPerMinute: 176,
  progression: ['C', 'F', 'Am', 'G'],
  step(v, step, t) {
    const beat = step % 8
    const name = chordAt(this, step)
    const strum = STRUM[beat]
    if (strum) {
      const strings = strum === 'down' ? UKULELE[name] : [...UKULELE[name]].reverse()
      strings.forEach((n, i) => pluck(v, n, t + i * 0.014, strum === 'down' ? 0.06 : 0.04))
    }
    if (beat === 0 || beat === 4) {
      bass(v, CHORDS[name][0], t, 0.12, 0.6)
      thump(v, t, 0.12)
    }
    // The whistled tune comes in every second time through: two long chord notes per bar.
    if (Math.floor(step / 32) % 2 === 1 && (beat === 0 || beat === 4)) {
      const eighth = 60 / this.eighthsPerMinute
      whistle(v, pick(CHORDS[name].slice(1)) + 12, t, eighth * 3.5)
    }
  },
  jingle(v, t, eighth) {
    // A quick strum, then three rising plucks.
    UKULELE.C.forEach((n, i) => pluck(v, n, t + i * 0.014, 0.12))
    pluck(v, 76, t + eighth, 0.18, true)
    pluck(v, 79, t + 2 * eighth, 0.18, true)
    pluck(v, 84, t + 3 * eighth, 0.22, true)
  },
}

export const SONGS: Record<MusicStyle, Song> = {
  spieluhr,
  marimba: marimbaSong,
  lagerfeuer,
}
