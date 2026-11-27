/**
 * Sound for the brushing timer, generated with the Web Audio API (no audio files):
 * - optional background music, the song of the child's animal (see music.ts),
 * - a short phrase at each section change, in the instrument of the chosen song,
 * - a little bell melody at the end,
 * - and on the home page the quiet forest sound (see forest/ambience.ts).
 *
 * Music and sounds have their own volume (bus): the jingles and bells still play when the music is
 * off, and the music steps back while a jingle plays. A soft limiter on the output catches peaks.
 *
 * The AudioContext must be created from a tap (browser autoplay rules). When another app takes the
 * sound, coming back to the page or the next tap brings it back, with a new context if needed.
 *
 * When nothing should sound any more, the context is suspended after the fade ("held"), so iOS
 * drops its Now Playing entry; it only wakes again when something plays. While brushing (and its
 * jingles and bells) the iOS audio session is "playback", so the silent switch does not mute it;
 * otherwise it is "ambient": the forest mixes with other apps and does not take over Now Playing.
 */

import type { Animal } from '@/features/family/schema'
import { playForest, type Forest, type ForestMood, type Hum } from '@/features/forest/ambience'
import { SONGS, type Voices } from './music'

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

/** The parts of the Media Session API used here; not every browser has it. */
type Media = {
  playbackState: 'none' | 'paused' | 'playing'
  setActionHandler: (action: 'play' | 'pause', handler: (() => void) | null) => void
}
const media = () => (navigator as Navigator & { mediaSession?: Media }).mediaSession

/** What the lock screen and Now Playing buttons do while brushing. */
export type MediaControls = { play: () => void; pause: () => void }

const MUSIC_LEVEL = 0.7
/** While a jingle plays, the music steps back to 40 % (about 8 dB quieter). */
const DUCKED_LEVEL = MUSIC_LEVEL * 0.4
/** The forest stays well in the background. */
const FOREST_LEVEL = 0.5
/** After the last sound, the context is suspended once the longest fade (the forest's) is over. */
const QUIET_AFTER = 2.5

export class BrushingAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private echo: DelayNode | null = null
  private sfxBus: GainNode | null = null
  private sfxEcho: DelayNode | null = null
  private forestBus: GainNode | null = null
  /** Which forest should sound (null: none); it comes back with a fresh context. */
  private forestMood: ForestMood | null = null
  private forest: Forest | null = null
  private musicOn = false
  private animal: Animal = 'owl'
  private step = 0
  private nextStepAt = 0
  private scheduleTimer: ReturnType<typeof setTimeout> | undefined
  private reviving = false
  private listening = false
  /** The child is brushing: the session stays "playback", Now Playing says "playing". */
  private brushing = false
  /** Audio clock time when the last jingle or bell has faded. */
  private sfxUntil = 0
  /** We suspended the context on purpose: nothing may wake it until something plays. */
  private held = false
  private quietTimer: ReturnType<typeof setTimeout> | undefined

  /**
   * Call from a tap handler: makes the sound on the first tap, and brings it back after another app
   * (a call, a video, the microphone) took it. iOS then leaves the context "interrupted" or
   * "suspended"; if it does not run again, a fresh context replaces it.
   */
  unlock() {
    const ctx = this.ctx
    if (!ctx || ctx.state === 'closed') {
      this.build()
      return
    }
    if (this.held) {
      if (!this.wanted()) return
      this.held = false
    }
    if (ctx.state === 'running' || this.reviving) return
    this.reviving = true
    void ctx
      .resume()
      .catch(() => undefined)
      .then(() => {
        this.reviving = false
        if (this.ctx === ctx && ctx.state !== 'running') this.rebuild()
      })
  }

  /** Tries to resume without a tap; if the browser refuses, the next tap does it (see listen). */
  private wake() {
    const ctx = this.ctx
    if (ctx && !this.held && ctx.state !== 'running' && ctx.state !== 'closed') {
      void ctx.resume().catch(() => undefined)
    }
  }

  /** Coming back to the page, and any tap, bring a stopped sound back. */
  private listen() {
    if (this.listening) return
    this.listening = true
    const wake = () => this.wake()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') wake()
    })
    window.addEventListener('pageshow', wake)
    window.addEventListener('focus', wake)
    const tap = () => {
      if (this.ctx && !this.held && this.ctx.state !== 'running') this.unlock()
    }
    for (const type of ['pointerdown', 'touchend']) {
      document.addEventListener(type, tap, { capture: true, passive: true })
    }
  }

  /** A new context with its volume buses; music that was on goes on where it was. */
  private build() {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
    if (!Ctor) return
    this.held = false
    this.applySession()
    const ctx = new Ctor()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    // A gentle safety limiter: children's devices are often turned up high.
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -6
    limiter.knee.value = 6
    limiter.ratio.value = 8
    limiter.attack.value = 0.003
    limiter.release.value = 0.25
    this.master.connect(limiter)
    limiter.connect(ctx.destination)

    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = this.musicOn ? MUSIC_LEVEL : 0
    this.musicBus.connect(this.master)
    this.echo = this.softEcho(ctx, this.musicBus)

    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = 1
    this.sfxBus.connect(this.master)
    this.sfxEcho = this.softEcho(ctx, this.sfxBus)

    this.forestBus = ctx.createGain()
    this.forestBus.gain.value = FOREST_LEVEL
    this.forestBus.connect(this.master)

    ctx.addEventListener('statechange', () => this.wake())
    this.listen()
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined)
    if (this.musicOn) {
      clearTimeout(this.scheduleTimer)
      this.playFrom(ctx.currentTime + 0.1)
    }
    if (this.forestMood) {
      this.forest?.stop(0)
      this.forest = playForest({ ctx, out: this.forestBus }, this.forestMood, this.hum)
    }
    this.refresh()
  }

  /** Something should sound now or soon. */
  private wanted() {
    return this.brushing || this.musicOn || this.forestMood !== null || this.sfxPlaying()
  }

  private sfxPlaying() {
    return !!this.ctx && this.ctx.currentTime < this.sfxUntil
  }

  /**
   * iOS mutes Web Audio with the silent switch unless the session is "playback": brushing needs
   * it. The forest alone is "ambient", so it never takes over from the family's own music.
   */
  private applySession() {
    const nav = navigator as AudioSessionNavigator
    if (!nav.audioSession) return
    const brushingSound = this.brushing || this.musicOn || this.sfxPlaying()
    nav.audioSession.type = brushingSound ? 'playback' : 'ambient'
  }

  /** Session, Now Playing state and the quiet timer, after anything started or stopped. */
  private refresh() {
    this.applySession()
    const m = media()
    if (m) m.playbackState = this.brushing ? 'playing' : 'none'
    clearTimeout(this.quietTimer)
    const ctx = this.ctx
    if (!ctx || this.held || this.brushing || this.musicOn || this.forestMood !== null) return
    // Only jingles or bells left (or nothing): wait until they and the fades are over.
    const left = Math.max(0, this.sfxUntil - ctx.currentTime)
    this.quietTimer = setTimeout(() => this.settle(), (left + QUIET_AFTER) * 1000)
  }

  /** Nothing sounds any more: suspend the context, so iOS drops the Now Playing entry. */
  private settle() {
    const ctx = this.ctx
    if (!ctx) return
    if (this.wanted()) {
      this.refresh()
      return
    }
    this.held = true
    if (ctx.state === 'running') void ctx.suspend().catch(() => undefined)
    this.refresh()
  }

  /** Something is about to play: wake a context we held (a refused resume waits for a tap). */
  private rouse() {
    clearTimeout(this.quietTimer)
    const ctx = this.ctx
    if (!ctx || !this.held) return
    this.held = false
    if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => undefined)
  }

  /** A jingle or bell plays until `until` (audio clock). */
  private sfxPlays(until: number) {
    this.rouse()
    this.sfxUntil = Math.max(this.sfxUntil, until)
    this.refresh()
  }

  /** The timer runs: session "playback" from the tap on, and the music if it is on. */
  startBrushing(music: boolean) {
    this.brushing = true
    this.refresh()
    this.unlock()
    if (music) this.startMusic()
  }

  /** Paused, done or left: the music fades; a last bell still plays to its end. */
  stopBrushing() {
    this.brushing = false
    this.stopMusic()
    this.refresh()
  }

  /** The Now Playing buttons do what the brushing page's own buttons do; null clears them. */
  setMediaControls(controls: MediaControls | null) {
    const m = media()
    if (!m) return
    for (const action of ['play', 'pause'] as const) {
      try {
        m.setActionHandler(action, controls ? controls[action] : null)
      } catch {
        // This browser does not know the action.
      }
    }
  }

  /**
   * The forest sound fades in. Before the first tap there is no context yet: it then starts with
   * the context, on that tap.
   */
  startForest(mood: ForestMood) {
    if (this.forestMood === mood && this.forest) return
    this.forest?.stop()
    this.forest = null
    this.forestMood = mood
    this.rouse()
    if (this.ctx && this.forestBus && this.ctx.state !== 'closed') {
      this.forest = playForest({ ctx: this.ctx, out: this.forestBus }, mood, this.hum)
    }
    this.refresh()
  }

  /** The animal's corner jingle, softly and without echo, for the forest. */
  private hum: Hum = ({ ctx, out }, t) => {
    const soft = ctx.createGain()
    soft.gain.value = 0.35
    soft.connect(out)
    const song = SONGS[this.animal]
    song.jingle({ ctx, out: soft, echo: soft }, t, 60 / song.eighthsPerMinute)
  }

  /** The forest sound fades out and stops. */
  stopForest() {
    this.forestMood = null
    this.forest?.stop()
    this.forest = null
    this.refresh()
  }

  /** Throws the dead context away and builds a new one. */
  private rebuild() {
    const old = this.ctx
    if (old && old.state !== 'closed') void old.close().catch(() => undefined)
    this.build()
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
    this.sfxPlays(t + 1.0 + 3.6)
  }

  /** A soft little bell for an uncovered photo field; `step` climbs a pentatonic scale. */
  chime(step = 0) {
    if (!this.ctx) return
    const notes = [783.99, 880, 1046.5, 1174.66, 1318.51]
    this.bell(notes[Math.abs(step) % notes.length]!, this.ctx.currentTime + 0.02, 0.12, 1.6)
    this.sfxPlays(this.ctx.currentTime + 1.7)
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
    this.rouse()
    this.refresh()
    bus.gain.cancelScheduledValues(ctx.currentTime)
    bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime)
    bus.gain.linearRampToValueAtTime(MUSIC_LEVEL, ctx.currentTime + 1.5)
    // Each start (also after a pause) begins the song from the top.
    this.step = 0
    this.playFrom(ctx.currentTime + 0.1)
  }

  /** Plans the song from the current step on, starting at `at`. */
  private playFrom(at: number) {
    // Echo on the dotted eighth, so it bounces in time.
    this.echo?.delayTime.setValueAtTime((60 / SONGS[this.animal].eighthsPerMinute) * 1.5, at)
    this.nextStepAt = at
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
    const now = v.ctx.currentTime
    // If the timers stalled while the audio clock ran on, skip the missed notes and stay in time.
    if (this.nextStepAt < now) {
      const missed = Math.ceil((now - this.nextStepAt) / eighth)
      this.step += missed
      this.nextStepAt += missed * eighth
    }
    while (this.nextStepAt < now + 0.25) {
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
    // The echo rings on for a while after the last note.
    this.sfxPlays(t + (eighths + 1) * eighth + 2)
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
    this.refresh()
    const t = ctx.currentTime
    bus.gain.cancelScheduledValues(t)
    bus.gain.setValueAtTime(bus.gain.value, t)
    // Notes already planned fade out with the music.
    bus.gain.linearRampToValueAtTime(0, t + 0.8)
  }
}

export const brushingAudio = new BrushingAudio()
