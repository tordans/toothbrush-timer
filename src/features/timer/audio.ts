/**
 * Sound for the brushing timer, generated with the Web Audio API (no audio files):
 * - optional background music, the song of the child's animal (see music.ts),
 * - a short phrase at each section change, in the instrument of the chosen song,
 * - a little bell melody at the end.
 *
 * Music and sounds have their own volume (bus): the jingles and bells still play when the music is
 * off, and the music steps back while a jingle plays. A soft limiter on the output catches peaks.
 *
 * The AudioContext must be created from a tap (browser autoplay rules).
 */

import type { Animal } from '@/features/family/schema'
import { SONGS, type Voices } from './music'

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

const MUSIC_LEVEL = 0.7
/** While a jingle plays, the music steps back to 40 % (about 8 dB quieter). */
const DUCKED_LEVEL = MUSIC_LEVEL * 0.4

class BrushingAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private echo: DelayNode | null = null
  private sfxBus: GainNode | null = null
  private sfxEcho: DelayNode | null = null
  private musicOn = false
  private animal: Animal = 'owl'
  private step = 0
  private nextStepAt = 0
  private scheduleTimer: ReturnType<typeof setTimeout> | undefined

  /** Call from a tap handler. */
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
      if (!Ctor) return
      // iOS mutes Web Audio with the silent switch unless the session is "playback".
      const nav = navigator as AudioSessionNavigator
      if (nav.audioSession) nav.audioSession.type = 'playback'
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      // A gentle safety limiter: children's devices are often turned up high.
      const limiter = this.ctx.createDynamicsCompressor()
      limiter.threshold.value = -6
      limiter.knee.value = 6
      limiter.ratio.value = 8
      limiter.attack.value = 0.003
      limiter.release.value = 0.25
      this.master.connect(limiter)
      limiter.connect(this.ctx.destination)

      this.musicBus = this.ctx.createGain()
      this.musicBus.gain.value = 0
      this.musicBus.connect(this.master)
      this.echo = this.softEcho(this.ctx, this.musicBus)

      this.sfxBus = this.ctx.createGain()
      this.sfxBus.gain.value = 1
      this.sfxBus.connect(this.master)
      this.sfxEcho = this.softEcho(this.ctx, this.sfxBus)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  /** A soft echo into `out`: a delay whose repeats get darker and quieter. */
  private softEcho(ctx: AudioContext, out: AudioNode) {
    const echo = ctx.createDelay(2)
    echo.delayTime.value = 0.42
    const feedback = ctx.createGain()
    feedback.gain.value = 0.35
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 1800
    echo.connect(tone)
    tone.connect(feedback)
    feedback.connect(echo)
    tone.connect(out)
    return echo
  }

  private bell(freq: number, when: number, level: number, length = 2.8) {
    const ctx = this.ctx
    const out = this.sfxBus
    if (!ctx || !out) return
    // Partials of a small bell; higher ones fade faster.
    const partials: [number, number, number][] = [
      [1, 1, 1],
      [2.76, 0.32, 0.55],
      [5.4, 0.14, 0.35],
      [8.93, 0.06, 0.2],
    ]
    for (const [ratio, gain, decay] of partials) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * ratio
      const env = ctx.createGain()
      env.gain.setValueAtTime(0.0001, when)
      env.gain.exponentialRampToValueAtTime(level * gain, when + 0.01)
      env.gain.exponentialRampToValueAtTime(0.0001, when + length * decay)
      osc.connect(env)
      env.connect(out)
      osc.start(when)
      osc.stop(when + length * decay + 0.05)
    }
  }

  /** A little melody at the end. */
  finishMelody() {
    if (!this.ctx) return
    const t = this.ctx.currentTime + 0.05
    const notes: [number, number][] = [
      [523.25, 0],
      [659.25, 0.18],
      [783.99, 0.36],
      [659.25, 0.6],
      [783.99, 0.78],
      [1046.5, 1.0],
    ]
    for (const [freq, at] of notes) this.bell(freq, t + at, 0.3, at === 1.0 ? 3.6 : 1.8)
  }

  /** A soft little bell for an uncovered photo field; `step` climbs a pentatonic scale. */
  chime(step = 0) {
    if (!this.ctx) return
    const notes = [783.99, 880, 1046.5, 1174.66, 1318.51]
    this.bell(notes[Math.abs(step) % notes.length]!, this.ctx.currentTime + 0.02, 0.12, 1.6)
  }

  /** Whose song plays; the corner jingle follows it even when the music is off. */
  setAnimal(animal: Animal) {
    this.animal = animal
  }

  /** The song's instruments, playing into the music bus. */
  private voices(): Voices | null {
    if (!this.ctx || !this.musicBus || !this.echo) return null
    return { ctx: this.ctx, out: this.musicBus, echo: this.echo }
  }

  /** The same instruments, playing into the sound bus (for jingles). */
  private sfxVoices(): Voices | null {
    if (!this.ctx || !this.sfxBus || !this.sfxEcho) return null
    return { ctx: this.ctx, out: this.sfxBus, echo: this.sfxEcho }
  }

  startMusic() {
    const ctx = this.ctx
    const bus = this.musicBus
    if (!ctx || !bus || this.musicOn) return
    this.musicOn = true
    bus.gain.cancelScheduledValues(ctx.currentTime)
    bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime)
    bus.gain.linearRampToValueAtTime(MUSIC_LEVEL, ctx.currentTime + 1.5)
    // Each start (also after a pause) begins the song from the top.
    this.step = 0
    // Echo on the dotted eighth, so it bounces in time.
    this.echo?.delayTime.setValueAtTime(
      (60 / SONGS[this.animal].eighthsPerMinute) * 1.5,
      ctx.currentTime,
    )
    this.nextStepAt = ctx.currentTime + 0.1
    this.schedule()
  }

  /**
   * Plans the notes of the next quarter second, then checks again soon. Timers in the browser
   * are not exact, the audio clock is; so notes are placed on the audio clock ahead of time.
   */
  private schedule() {
    const v = this.voices()
    if (!v || !this.musicOn) return
    const song = SONGS[this.animal]
    const eighth = 60 / song.eighthsPerMinute
    while (this.nextStepAt < v.ctx.currentTime + 0.25) {
      song.step(v, this.step, this.nextStepAt)
      this.step++
      this.nextStepAt += eighth
    }
    this.scheduleTimer = setTimeout(() => this.schedule(), 50)
  }

  /** Short phrase in the song's instrument: this corner is done, move on to the next. */
  switchJingle() {
    const v = this.sfxVoices()
    if (!v) return
    const song = SONGS[this.animal]
    const eighth = 60 / song.eighthsPerMinute
    this.sfxEcho?.delayTime.setValueAtTime(eighth * 1.5, v.ctx.currentTime)
    let t = v.ctx.currentTime + 0.02
    if (this.musicOn) {
      // Wait for the next full beat, so the jingle lands in time with the song.
      const stepsToBeat = this.step % 2
      t = Math.max(t, this.nextStepAt + stepsToBeat * eighth)
    }
    const eighths = song.jingle(v, t, eighth)
    if (this.musicOn) this.duck(t, t + (eighths + 1) * eighth)
  }

  /** The music steps back under a jingle and comes back over half a second. */
  private duck(from: number, until: number) {
    const ctx = this.ctx
    const bus = this.musicBus
    if (!ctx || !bus) return
    const now = ctx.currentTime
    bus.gain.cancelScheduledValues(now)
    bus.gain.setValueAtTime(bus.gain.value, now)
    bus.gain.linearRampToValueAtTime(bus.gain.value, Math.max(now, from - 0.06))
    bus.gain.linearRampToValueAtTime(DUCKED_LEVEL, Math.max(now, from - 0.01))
    bus.gain.setValueAtTime(DUCKED_LEVEL, until)
    bus.gain.linearRampToValueAtTime(MUSIC_LEVEL, until + 0.5)
  }

  stopMusic() {
    const ctx = this.ctx
    const bus = this.musicBus
    clearTimeout(this.scheduleTimer)
    if (!ctx || !bus || !this.musicOn) return
    this.musicOn = false
    const t = ctx.currentTime
    bus.gain.cancelScheduledValues(t)
    bus.gain.setValueAtTime(bus.gain.value, t)
    // Notes already planned fade out with the music.
    bus.gain.linearRampToValueAtTime(0, t + 0.8)
  }
}

export const brushingAudio = new BrushingAudio()
