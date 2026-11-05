/**
 * Sound for the brushing timer, generated with the Web Audio API (no audio files):
 * - a soft bell at each section change,
 * - three rising bell notes at the end,
 * - optional calm background music: a quiet drone plus slow pentatonic notes with an echo.
 *
 * The AudioContext must be created from a tap (browser autoplay rules).
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

// Pentatonic scale on C, two octaves (Hz). No wrong notes, no tension.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0]

class BrushingAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private echo: DelayNode | null = null
  private drone: OscillatorNode[] = []
  private noteTimer: ReturnType<typeof setTimeout> | undefined
  private musicOn = false

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
      this.master.connect(this.ctx.destination)

      this.musicBus = this.ctx.createGain()
      this.musicBus.gain.value = 0
      this.echo = this.ctx.createDelay(2)
      this.echo.delayTime.value = 0.42
      const feedback = this.ctx.createGain()
      feedback.gain.value = 0.35
      const echoTone = this.ctx.createBiquadFilter()
      echoTone.type = 'lowpass'
      echoTone.frequency.value = 1800
      this.echo.connect(echoTone)
      echoTone.connect(feedback)
      feedback.connect(this.echo)
      echoTone.connect(this.musicBus)
      this.musicBus.connect(this.master)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  private bell(freq: number, when: number, level: number, length = 2.8) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
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
      env.connect(master)
      osc.start(when)
      osc.stop(when + length * decay + 0.05)
    }
  }

  sectionBell() {
    if (!this.ctx) return
    this.bell(523.25, this.ctx.currentTime + 0.02, 0.35)
  }

  finishBells() {
    if (!this.ctx) return
    const t = this.ctx.currentTime + 0.05
    this.bell(523.25, t, 0.3)
    this.bell(659.25, t + 0.35, 0.3)
    this.bell(783.99, t + 0.7, 0.35, 3.6)
  }

  startMusic() {
    const ctx = this.ctx
    const bus = this.musicBus
    if (!ctx || !bus || this.musicOn) return
    this.musicOn = true
    bus.gain.cancelScheduledValues(ctx.currentTime)
    bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime)
    bus.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2)

    // Quiet drone: C and G, slightly detuned for warmth.
    this.drone = [130.81, 196.0, 131.2].map((freq) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const g = ctx.createGain()
      g.gain.value = 0.035
      osc.connect(g)
      g.connect(bus)
      osc.start()
      return osc
    })
    this.playNote()
  }

  private playNote() {
    const ctx = this.ctx
    const bus = this.musicBus
    const echo = this.echo
    if (!ctx || !bus || !echo || !this.musicOn) return
    const freq = SCALE[Math.floor(Math.random() * SCALE.length)] ?? 440
    const t = ctx.currentTime + 0.02
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.linearRampToValueAtTime(0.09, t + 0.08)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2.2)
    osc.connect(env)
    env.connect(bus)
    env.connect(echo)
    osc.start(t)
    osc.stop(t + 2.3)
    // Slow and uneven, like wind chimes.
    this.noteTimer = setTimeout(() => this.playNote(), 900 + Math.random() * 1600)
  }

  stopMusic() {
    const ctx = this.ctx
    const bus = this.musicBus
    clearTimeout(this.noteTimer)
    if (!ctx || !bus || !this.musicOn) return
    this.musicOn = false
    const t = ctx.currentTime
    bus.gain.cancelScheduledValues(t)
    bus.gain.setValueAtTime(bus.gain.value, t)
    bus.gain.linearRampToValueAtTime(0, t + 0.8)
    for (const osc of this.drone) osc.stop(t + 0.9)
    this.drone = []
  }
}

export const brushingAudio = new BrushingAudio()
