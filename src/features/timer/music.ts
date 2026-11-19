import type { Animal } from '@/features/family/schema'

/**
 * One song per animal, played live with the Web Audio API (no audio files). Each one loops a
 * four-bar chord progression in C major at a walking tempo: lively enough to keep going, but no
 * fast drums and no sharp sounds. Each song has its own corner jingle, played with the same
 * instrument and on its beat, so the jingle sounds like part of the song.
 *
 * Every jingle rises and ends on a C, but each animal has its own rhythm and its own last step into
 * that C, so a child can tell them apart by the tune and not only by the sound:
 * owl B→C (half step), koala A→C (third), fox G→C (fourth), rabbit F→C (fifth), bear E→C (sixth),
 * squirrel C→C' (octave jump), hedgehog C–C (the same note twice).
 */

/** MIDI note number to Hz (69 = A4 = 440 Hz). */
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

/** Chords as MIDI notes; the first one is the bass root (octave 3). */
const CHORDS = {
  C: [48, 60, 64, 67],
  Am: [45, 57, 60, 64],
  F: [41, 57, 60, 65],
  G: [43, 55, 59, 62],
  Dm: [50, 57, 62, 65],
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
/** A tenth of a second of white noise, made once. */
function noiseBuffer(v: Voices) {
  if (!noise || noise.sampleRate !== v.ctx.sampleRate) {
    noise = v.ctx.createBuffer(1, v.ctx.sampleRate * 0.1, v.ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noise
}

/** Very quiet shaker: a puff of high noise. */
function shaker(v: Voices, t: number, level: number) {
  const src = v.ctx.createBufferSource()
  src.buffer = noiseBuffer(v)
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
  /**
   * Short rising phrase for a new corner, in the song's instrument. Returns how many eighths it
   * lasts until its last note, so the music can step back for that long.
   */
  jingle: (v: Voices, t: number, eighth: number) => number
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
    // Calm thirds up, then the half step home: E – G – B – C, the first note held.
    musicBox(v, 76, t, 0.18)
    musicBox(v, 79, t + 2 * eighth, 0.18)
    musicBox(v, 83, t + 3 * eighth, 0.16)
    musicBox(v, 84, t + 4 * eighth, 0.22)
    return 4
  },
}

// Marimba: bouncing broken chords, a syncopated bass and a whisper of shaker. The first half goes
// C – G – Am – F, the second half answers Am – F – C – G and so leads back to the start.
const ARPEGGIO = [1, 2, 3, 2, 1, 2, 3, 2]
const marimbaSong: Song = {
  eighthsPerMinute: 200,
  progression: ['C', 'G', 'Am', 'F', 'Am', 'F', 'C', 'G'],
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
    // A quick burst, a pause, then the octave jump: C – G, … C – C'.
    marimba(v, 72, t, 0.18)
    marimba(v, 79, t + eighth, 0.18)
    marimba(v, 72, t + 3 * eighth, 0.18)
    marimba(v, 84, t + 4 * eighth, 0.24, true)
    return 4
  },
}

// Lagerfeuer: strummed ukulele chords over C – F – Am – G, box-drum thumps, a whistled tune.
const UKULELE: Record<Chord, number[]> = {
  C: [67, 60, 64, 72],
  F: [69, 65, 69, 72],
  Am: [69, 60, 64, 69],
  G: [67, 62, 67, 71],
  Dm: [69, 62, 65, 69],
}
// Down, -, down, up, -, up, down, up
const STRUM: ('down' | 'up' | null)[] = ['down', null, 'down', 'up', null, 'up', 'down', 'up']

function whistle(v: Voices, midi: number, t: number, length: number, level = 0.06) {
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
  env.gain.linearRampToValueAtTime(level, t + 0.06)
  env.gain.setValueAtTime(level, t + length * 0.7)
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
    // A warm strum on G, one low pluck, then a long whistled C a sixth above it.
    UKULELE.G.forEach((n, i) => pluck(v, n, t + i * 0.014, 0.09))
    thump(v, t, 0.1)
    pluck(v, 64, t + eighth, 0.16)
    UKULELE.C.forEach((n, i) => pluck(v, n, t + 2 * eighth + i * 0.014, 0.07))
    whistle(v, 72, t + 2 * eighth, 3 * eighth, 0.12)
    return 2
  },
}

// Fuchs: tip-toe pizzicato. A staccato bass walks up and down the chord, small stabs sneak in
// on the off-beats, and a sly tune pops up in the gaps. C – Am – Dm – G.
/** Pizzicato: a plucked string that is bright for a blink and then stops, like a fox's step. */
function pizzicato(v: Voices, midi: number, t: number, level: number, echo = false) {
  const osc = v.ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = hz(midi)
  const tone = v.ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.setValueAtTime(2400, t)
  tone.frequency.exponentialRampToValueAtTime(450, t + 0.2)
  const env = envelope(v, t, level, 0.003, 0.3)
  osc.connect(tone)
  tone.connect(env)
  env.connect(v.out)
  if (echo) env.connect(v.echo)
  osc.start(t)
  osc.stop(t + 0.4)
}

const FOX_PROGRESSION: Chord[] = ['C', 'Am', 'Dm', 'G']
/** Four quarter notes per bar: root, up, up, back down. */
const FOX_WALK: Record<Chord, number[]> = {
  C: [48, 52, 55, 52],
  Am: [45, 48, 52, 48],
  Dm: [50, 53, 57, 53],
  G: [43, 47, 50, 47],
  F: [41, 45, 48, 45],
}
const FOX_TUNE_A = [
  [R, 64, 67, R, 72, R, 67, 64],
  [R, 69, 72, R, 76, R, 72, 69],
  [R, 65, 69, R, 74, R, 69, 65],
  [R, 67, 71, R, 74, R, 71, 67],
]
const FOX_TUNE_B = [
  [R, 72, R, 67, 64, R, 67, R],
  [R, 76, R, 72, 69, R, 72, R],
  [R, 74, R, 69, 65, R, 69, R],
  [71, R, 74, R, 79, R, 74, 71],
]

const fox: Song = {
  eighthsPerMinute: 192,
  progression: FOX_PROGRESSION,
  step(v, step, t) {
    const bar = Math.floor(step / 8)
    const beat = step % 8
    const chord = CHORDS[chordAt(fox, step)]
    const walk = FOX_WALK[chordAt(fox, step)]
    // The walk: one short bass note per quarter, each on its tiptoe.
    if (beat % 2 === 0) bass(v, walk[beat / 2] ?? chord[0], t, 0.16, 0.4)
    // Stabs between the steps.
    if (beat === 3) pizzicato(v, chord[2], t, 0.09)
    if (beat === 7) pizzicato(v, chord[3], t, 0.09)
    // The tune, A the first time through and B the second, and so on.
    const tune = Math.floor(step / 32) % 2 === 0 ? FOX_TUNE_A : FOX_TUNE_B
    const note = tune[bar % tune.length]?.[beat]
    if (note != null) pizzicato(v, note, t, 0.13, true)
  },
  jingle(v, t, eighth) {
    // A rest, two tiptoes off the beat, a held breath, then the pounce up a fourth: … E G … C.
    pizzicato(v, 64, t + eighth, 0.22)
    pizzicato(v, 67, t + 2 * eighth, 0.22)
    pizzicato(v, 72, t + 4 * eighth, 0.34, true)
    pizzicato(v, 60, t + 4 * eighth, 0.12)
    return 4
  },
}

// Igel: small, busy and cosy. A soft wooden tick-tack runs on every eighth, a dull little pluck
// plays a bouncy tune, and a short bass hops underneath. C – F – C – G.
/** Soft woodblock: a tiny knock of a quickly falling sine plus a click of noise. */
function woodblock(v: Voices, t: number, level: number, freq: number) {
  const osc = v.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq * 1.2, t)
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.02)
  const knock = envelope(v, t, level, 0.002, 0.05)
  osc.connect(knock)
  knock.connect(v.out)
  osc.start(t)
  osc.stop(t + 0.08)
  const src = v.ctx.createBufferSource()
  src.buffer = noiseBuffer(v)
  const band = v.ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = freq * 2
  band.Q.value = 2
  const click = envelope(v, t, level * 0.5, 0.002, 0.025)
  src.connect(band)
  band.connect(click)
  click.connect(v.out)
  src.start(t)
  src.stop(t + 0.06)
}

/** Muted pluck: a hollow, round little tone that stops almost at once. */
function mutedPluck(v: Voices, midi: number, t: number, level: number, echo = false) {
  const f = hz(midi)
  const body = envelope(v, t, level, 0.003, 0.22)
  const hollow = envelope(v, t, level * 0.3, 0.002, 0.05)
  const osc = v.ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(f * 1.03, t)
  osc.frequency.exponentialRampToValueAtTime(f, t + 0.03)
  osc.connect(body)
  osc.start(t)
  osc.stop(t + 0.3)
  sine(v, f * 2, t, t + 0.08, hollow)
  for (const env of [body, hollow]) {
    env.connect(v.out)
    if (echo) env.connect(v.echo)
  }
}

const HEDGEHOG_PROGRESSION: Chord[] = ['C', 'F', 'C', 'G']
const HEDGEHOG_TUNE_A = [
  [72, R, 72, 76, 79, R, 76, R],
  [77, R, 77, 81, 77, R, 72, R],
  [72, R, 72, 76, 79, R, 84, R],
  [83, R, 79, 74, 71, R, 67, R],
]
const HEDGEHOG_TUNE_B = [
  [76, 76, R, 72, 76, R, 79, R],
  [81, 81, R, 77, 81, R, 77, R],
  [79, 79, R, 76, 79, R, 72, R],
  [74, 74, R, 71, 74, 79, 74, R],
]

const hedgehog: Song = {
  // A little slower than the squirrel (200), between the owl and the fox: busy, but trundling.
  eighthsPerMinute: 188,
  progression: HEDGEHOG_PROGRESSION,
  step(v, step, t) {
    const bar = Math.floor(step / 8)
    const beat = step % 8
    const chord = CHORDS[chordAt(hedgehog, step)]
    // Tip (low), tap (high), tip, tap ...
    woodblock(v, t, beat % 2 === 0 ? 0.085 : 0.06, beat % 2 === 0 ? 900 : 1300)
    if (beat === 0) bass(v, chord[0], t, 0.12, 0.4)
    if (beat === 3) bass(v, chord[0] + 12, t, 0.07, 0.15)
    if (beat === 4) bass(v, chord[0] + 7, t, 0.1, 0.4)
    const tune = Math.floor(step / 32) % 2 === 0 ? HEDGEHOG_TUNE_A : HEDGEHOG_TUNE_B
    const note = tune[bar % tune.length]?.[beat]
    if (note != null) mutedPluck(v, note, t, 0.16, true)
  },
  jingle(v, t, eighth) {
    // Little steps scurrying up, even eighths, and the top note twice: G A B C C, tick … tack.
    woodblock(v, t, 0.08, 1300)
    ;[79, 81, 83, 84].forEach((n, i) => mutedPluck(v, n, t + i * eighth, 0.17))
    mutedPluck(v, 84, t + 4 * eighth, 0.21, true)
    woodblock(v, t + 4 * eighth, 0.07, 900)
    return 4
  },
}

// Hase: hopping and bright. Every quarter is a skip, long then short, on a chirpy toy piano; the
// bass hops with a little upward boing. C – G – F – G.
/** Toy piano: a hollow tone (odd partials) from two slightly detuned strings, short and bright. */
function toyPiano(v: Voices, midi: number, t: number, level: number, echo = false) {
  const f = hz(midi)
  const body = envelope(v, t, level, 0.003, 0.32)
  const chirp = envelope(v, t, level * 0.3, 0.002, 0.12)
  sine(v, f, t, t + 0.4, body)
  sine(v, f * 1.004, t, t + 0.4, body)
  sine(v, f * 3, t, t + 0.15, chirp)
  for (const env of [body, chirp]) {
    env.connect(v.out)
    if (echo) env.connect(v.echo)
  }
}

/** A hop: a soft round bass note that bends up a little as it lands. */
function hop(v: Voices, midi: number, t: number, level: number) {
  const osc = v.ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(hz(midi) * 0.85, t)
  osc.frequency.exponentialRampToValueAtTime(hz(midi), t + 0.05)
  const env = envelope(v, t, level, 0.008, 0.2)
  osc.connect(env)
  env.connect(v.out)
  osc.start(t)
  osc.stop(t + 0.3)
}

const RABBIT_TEMPO = 196
const RABBIT_PROGRESSION: Chord[] = ['C', 'G', 'F', 'G']
// Eight notes per bar: long, short, long, short ...
const RABBIT_TUNE_A = [
  [72, 76, 79, 76, 84, 79, 76, 72],
  [71, 74, 79, 74, 83, 79, 74, 71],
  [72, 77, 81, 77, 84, 81, 77, 72],
  [79, 74, 79, 83, 79, 74, 71, 74],
]
const RABBIT_TUNE_B = [
  [79, 76, 72, 76, 79, 84, 79, 76],
  [79, 74, 71, 74, 79, 83, 79, 74],
  [77, 72, 77, 81, 84, 81, 77, 72],
  [83, 79, 74, 79, 83, 79, 74, 71],
]

const rabbit: Song = {
  eighthsPerMinute: RABBIT_TEMPO,
  progression: RABBIT_PROGRESSION,
  step(v, step, t) {
    const bar = Math.floor(step / 8)
    const beat = step % 8
    const chord = CHORDS[chordAt(rabbit, step)]
    const second = Math.floor(step / 32) % 2 === 1
    if (beat % 2 === 0) {
      // One skip per quarter: the short note comes after three quarters of the beat.
      const tune = second ? RABBIT_TUNE_B : RABBIT_TUNE_A
      const pair = tune[bar % tune.length]
      const eighth = 60 / RABBIT_TEMPO
      toyPiano(v, pair?.[beat] ?? chord[1], t, 0.12)
      toyPiano(v, pair?.[beat + 1] ?? chord[2], t + 1.5 * eighth, 0.08, second)
      // Hop, hop: root and fifth.
      hop(v, beat % 4 === 0 ? chord[0] : chord[0] + 7, t, 0.12)
    } else if (second && beat % 4 === 3) {
      // The second time through, a soft chord note lands between the hops.
      toyPiano(v, chord[2], t, 0.04)
    }
  },
  jingle(v, t, eighth) {
    // Two skips up the scale (long-short, long-short), then a jump of a fifth: C D, E F, C'.
    const skips: [number, number][] = [
      [0, 72],
      [1.5, 74],
      [2, 76],
      [3.5, 77],
    ]
    for (const [at, n] of skips) toyPiano(v, n, t + at * eighth, at % 1 === 0 ? 0.13 : 0.09)
    toyPiano(v, 84, t + 4 * eighth, 0.17, true)
    hop(v, 48, t, 0.09)
    hop(v, 48, t + 4 * eighth, 0.09)
    return 4
  },
}

// Koala: sleepy and content, but gently swaying. A warm pad breathes slowly with each bar, the bass
// rocks in a lazy 3 + 3 + 2, and a breathy flute sings a slow lullaby. F – C – Am – G.
/** Warm pad: two slightly detuned triangles per note, a slow swell, and a gentle breathing sway. */
function pad(v: Voices, midis: readonly number[], t: number, level: number, length: number) {
  const sway = v.ctx.createGain()
  sway.gain.value = 0.75
  const lfo = v.ctx.createOscillator()
  lfo.frequency.value = 0.32
  const depth = v.ctx.createGain()
  depth.gain.value = 0.25
  lfo.connect(depth)
  depth.connect(sway.gain)
  const warm = v.ctx.createBiquadFilter()
  warm.type = 'lowpass'
  warm.frequency.value = 1100
  const env = v.ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.linearRampToValueAtTime(level, t + 0.6)
  env.gain.setValueAtTime(level, t + length)
  env.gain.exponentialRampToValueAtTime(0.0001, t + length + 1.2)
  for (const midi of midis) {
    for (const detune of [-7, 7]) {
      const osc = v.ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = hz(midi)
      osc.detune.value = detune
      osc.connect(warm)
      osc.start(t)
      osc.stop(t + length + 1.3)
    }
  }
  warm.connect(env)
  env.connect(sway)
  sway.connect(v.out)
  lfo.start(t)
  lfo.stop(t + length + 1.3)
}

/** Breathy flute: a soft sine with a little airy noise and a slow vibrato that arrives late. */
function flute(v: Voices, midi: number, t: number, length: number, level: number) {
  const f = hz(midi)
  const env = v.ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.linearRampToValueAtTime(level, t + 0.09)
  env.gain.setValueAtTime(level, t + length * 0.7)
  env.gain.exponentialRampToValueAtTime(0.0001, t + length)
  const osc = v.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = f
  const vibrato = v.ctx.createOscillator()
  vibrato.frequency.value = 4.8
  const depth = v.ctx.createGain()
  depth.gain.setValueAtTime(0, t)
  depth.gain.linearRampToValueAtTime(f * 0.004, t + length * 0.6)
  vibrato.connect(depth)
  depth.connect(osc.frequency)
  osc.connect(env)
  sine(v, f * 2, t, t + length + 0.05, env)
  // The breath: noise around the second harmonic, only a whisper.
  const air = v.ctx.createBufferSource()
  air.buffer = noiseBuffer(v)
  air.loop = true
  const band = v.ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = f * 2
  band.Q.value = 1.5
  const whisper = v.ctx.createGain()
  whisper.gain.value = 0.35
  air.connect(band)
  band.connect(whisper)
  whisper.connect(env)
  env.connect(v.out)
  env.connect(v.echo)
  for (const o of [osc, vibrato, air]) {
    o.start(t)
    o.stop(t + length + 0.05)
  }
}

const KOALA_PROGRESSION: Chord[] = ['F', 'C', 'Am', 'G']
/** A slow lullaby: [beat in the bar, note, length in eighths], three notes per bar. */
const KOALA_TUNE_A: [number, number, number][][] = [
  [
    [0, 72, 3],
    [3, 69, 3],
    [6, 67, 2],
  ],
  [
    [0, 64, 3],
    [3, 67, 3],
    [6, 72, 2],
  ],
  [
    [0, 69, 3],
    [3, 72, 3],
    [6, 76, 2],
  ],
  [
    [0, 74, 3],
    [3, 71, 3],
    [6, 67, 2],
  ],
]
const KOALA_TUNE_B: [number, number, number][][] = [
  [
    [0, 77, 3],
    [3, 72, 2],
    [5, 69, 3],
  ],
  [
    [0, 76, 3],
    [3, 72, 3],
    [6, 67, 2],
  ],
  [
    [0, 72, 3],
    [3, 69, 3],
    [6, 64, 2],
  ],
  [
    [0, 71, 4],
    [4, 74, 2],
    [6, 71, 2],
  ],
]

const KOALA_TEMPO = 152
const koala: Song = {
  eighthsPerMinute: KOALA_TEMPO,
  progression: KOALA_PROGRESSION,
  step(v, step, t) {
    const bar = Math.floor(step / 8)
    const beat = step % 8
    const eighth = 60 / KOALA_TEMPO
    const chord = CHORDS[chordAt(koala, step)]
    // One pad chord per bar, swelling slowly and overlapping the next.
    if (beat === 0) pad(v, [chord[1], chord[2], chord[3]], t, 0.009, 8 * eighth)
    // The sway: root, fifth, root, in a lazy 3 + 3 + 2.
    if (beat === 0) bass(v, chord[0], t, 0.06, 1)
    if (beat === 3) bass(v, chord[0] + 7, t, 0.04, 0.8)
    if (beat === 6) bass(v, chord[0], t, 0.035, 0.6)
    // The flute: the second time through, the lullaby turns a little.
    const tune = Math.floor(step / 32) % 2 === 0 ? KOALA_TUNE_A : KOALA_TUNE_B
    for (const [at, note, length] of tune[bar % tune.length] ?? []) {
      if (at === beat) flute(v, note, t, length * eighth * 0.95, 0.045)
    }
  },
  jingle(v, t, eighth) {
    // A soft chord swells while the flute lazily climbs G – A, then a third up to a long C.
    pad(v, [64, 67, 72], t, 0.008, 4 * eighth)
    flute(v, 67, t, 1.9 * eighth, 0.05)
    flute(v, 69, t + 2 * eighth, 0.95 * eighth, 0.05)
    flute(v, 72, t + 3 * eighth, 3 * eighth, 0.06)
    return 3
  },
}

export const SONGS: Record<Animal, Song> = {
  owl: spieluhr,
  squirrel: marimbaSong,
  bear: lagerfeuer,
  fox,
  hedgehog,
  rabbit,
  koala,
}
