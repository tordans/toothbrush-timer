import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  CloseIcon,
  MusicIcon,
  MusicOffIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
} from '@/components/icons'
import { Button, Card } from '@/components/ui'
import { familyStore, useFamily, useFamilyActions } from '@/features/family/family-store'
import type { Animal as AnimalId } from '@/features/family/schema'
import { Animal } from '@/features/forest/Animal'
import { EveningLantern, MorningFlower } from '@/features/forest/scenery'
import { brushingAudio } from '@/features/timer/audio'
import { MouthDial } from '@/features/timer/MouthDial'
import { brushingSeconds, clockLabel, SECTIONS } from '@/features/timer/sections'
import { useBrushingTimer } from '@/features/timer/use-brushing-timer'
import { allowScreenOff, keepScreenOn } from '@/features/timer/wake-lock'
import { useThemeColor } from '@/hooks/use-theme-color'
import { isoDay } from '@/lib/dates'

const route = getRouteApi('/putzen')

/** Where the animal sits around the dial for each corner. */
const CORNER_POSITION = {
  'top-left': { left: '-14%', top: '-10%' },
  'top-right': { left: '78%', top: '-10%' },
  'bottom-right': { left: '78%', top: '68%' },
  'bottom-left': { left: '-14%', top: '68%' },
} as const

export function BrushPage() {
  const { kid: kidId, slot } = route.useSearch()
  const navigate = useNavigate()
  const family = useFamily()
  const { recordBrushing } = useFamilyActions()
  const kid = family.kids[kidId]
  const { gong } = family.settings
  // The music button here only affects this brushing; the family setting stays as it is.
  const [music, setMusic] = useState(family.settings.music)
  // Fixed when the page opens, so changing the setting on another phone does not jump the timer.
  const [totalSeconds] = useState(() => brushingSeconds(kid?.toothbrush))

  // Date of the brushing is fixed when the page opens (brushing across midnight stays "today").
  const [date] = useState(() => isoDay(new Date()))
  const [askStop, setAskStop] = useState(false)
  const recorded = useRef(false)

  const record = (seconds: number) => {
    if (recorded.current) return
    // The kid may have been removed on another phone while brushing.
    const current = familyStore.getState().family.kids[kidId]
    if (!current || current.deleted) return
    recorded.current = true
    recordBrushing({ kidId, date, slot, seconds })
  }

  const timer = useBrushingTimer({
    totalSeconds,
    onSectionChange: () => {
      if (gong) brushingAudio.switchJingle()
    },
    onDone: () => {
      brushingAudio.stopMusic()
      if (gong) brushingAudio.finishMelody()
      allowScreenOff()
      record(totalSeconds)
    },
    onAutoPause: () => brushingAudio.stopMusic(),
  })

  // Every animal has its own song and corner jingle.
  const animal = kid?.animal
  useEffect(() => {
    if (animal) brushingAudio.setAnimal(animal)
  }, [animal])

  // Leaving the page (back button, navigation) always stops sound and the wake lock.
  useEffect(
    () => () => {
      brushingAudio.stopMusic()
      allowScreenOff()
    },
    [],
  )

  // Return to the forest a while after finishing.
  useEffect(() => {
    if (timer.phase !== 'done') return
    const id = setTimeout(() => void navigate({ to: '/' }), 25_000)
    return () => clearTimeout(id)
  }, [timer.phase, navigate])

  if (!kid || kid.deleted) {
    return (
      <main className="flex h-full items-center justify-center p-4">
        <Button onClick={() => void navigate({ to: '/' })}>Zurück in den Wald</Button>
      </main>
    )
  }

  const start = () => {
    brushingAudio.unlock()
    if (music) brushingAudio.startMusic()
    void keepScreenOn()
    timer.start()
  }
  const resume = () => {
    brushingAudio.unlock()
    if (music) brushingAudio.startMusic()
    void keepScreenOn()
    timer.start()
  }
  const pause = () => {
    brushingAudio.stopMusic()
    timer.pause()
  }
  const restart = () => {
    brushingAudio.unlock()
    if (music) brushingAudio.startMusic()
    void keepScreenOn()
    timer.restart()
  }
  const toggleMusic = () => {
    setMusic(!music)
    if (timer.phase !== 'running') return
    if (music) brushingAudio.stopMusic()
    else {
      brushingAudio.unlock()
      brushingAudio.startMusic()
    }
  }
  const close = () => {
    if (timer.phase === 'ready' || timer.phase === 'done') {
      void navigate({ to: '/' })
      return
    }
    if (timer.phase === 'running') pause()
    setAskStop(true)
  }

  const { position } = timer
  const section = SECTIONS[position.sectionIndex]
  const corner = section ?? SECTIONS[0]
  const evening = slot === 'evening'
  // The top colours of the two backgrounds below (night and #bfe3f2).
  useThemeColor(evening ? '#1f2347' : '#bfe3f2')

  return (
    <main
      className={twMerge(
        'relative flex h-full w-full touch-manipulation flex-col overflow-hidden',
        evening
          ? 'bg-gradient-to-b from-night via-dusk to-[#6b5a8e] text-white'
          : 'bg-gradient-to-b from-[#bfe3f2] via-[#e7f1df] to-[#cfe3a8] text-bark-900',
      )}
    >
      {/* top controls */}
      <div className="flex items-center justify-between pb-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:pb-4">
        <button
          type="button"
          onClick={close}
          aria-label="Aufhören"
          className="rounded-full bg-white/25 p-3 backdrop-blur-sm"
        >
          <CloseIcon className="h-7 w-7" />
        </button>
        <p className="text-lg font-extrabold">
          {kid.name} · {evening ? 'Abends' : 'Morgens'}
        </p>
        <button
          type="button"
          onClick={toggleMusic}
          aria-label={music ? 'Musik aus' : 'Musik an'}
          className="rounded-full bg-white/25 p-3 backdrop-blur-sm"
        >
          {music ? <MusicIcon className="h-7 w-7" /> : <MusicOffIcon className="h-7 w-7" />}
        </button>
      </div>

      {timer.phase === 'done' ? (
        <Done animal={kid.animal} evening={evening} onHome={() => void navigate({ to: '/' })} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] landscape:flex-row landscape:gap-10">
          {/* dial with the animal */}
          <div className="relative h-[min(78vw,46vh)] w-[min(78vw,46vh)] shrink-0 landscape:h-[min(42vw,62vh)] landscape:w-[min(42vw,62vh)]">
            <MouthDial
              sectionIndex={position.sectionIndex}
              sectionProgress={position.sectionProgress}
              switching={position.switching}
            />
            {/* The animal sits at the corner being brushed and walks on during the break. */}
            <div
              className="absolute w-[36%]"
              style={{
                ...CORNER_POSITION[corner?.id ?? 'top-left'],
                transition: 'left 1.4s ease-in-out, top 1.4s ease-in-out',
              }}
            >
              <div style={{ transform: corner?.side === 'right' ? 'scaleX(-1)' : undefined }}>
                <div
                  className={
                    position.switching && timer.phase === 'running' ? 'animate-wave' : 'animate-bob'
                  }
                >
                  <Animal
                    animal={kid.animal}
                    brushing={timer.phase === 'running' && !position.switching}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* text + buttons */}
          <div className="flex flex-col items-center gap-4 text-center landscape:items-start landscape:text-left">
            {timer.phase === 'ready' ? (
              <>
                <h1 className="text-3xl font-extrabold sm:text-4xl">
                  {totalSeconds === 180 ? 'Drei' : 'Zwei'} Minuten, vier Ecken.
                </h1>
                <p className="max-w-sm text-lg font-semibold opacity-80">
                  Oben links, oben rechts, unten rechts, unten links. Bei jedem Gong geht es weiter.
                </p>
                <Button size="xl" onClick={start}>
                  <PlayIcon className="h-8 w-8" />
                  Los geht’s
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold uppercase tracking-wider opacity-70">
                  {position.switching ? 'Wechseln!' : `Ecke ${position.sectionIndex + 1} von 4`}
                </p>
                <h1 className="text-4xl font-extrabold sm:text-5xl">
                  {position.switching ? `Gleich: ${section?.label}` : section?.label}
                </h1>
                <p className="text-2xl font-bold tabular-nums opacity-80">
                  noch {clockLabel(position.totalRemaining)}
                </p>
                <div className="flex items-center gap-3">
                  {timer.phase === 'running' ? (
                    <Button size="xl" variant="secondary" onClick={pause} aria-label="Pause">
                      <PauseIcon className="h-8 w-8" />
                      Pause
                    </Button>
                  ) : (
                    <Button size="xl" onClick={resume}>
                      <PlayIcon className="h-8 w-8" />
                      Weiter
                    </Button>
                  )}
                  {/* Only while paused, so a finger next to "Pause" cannot reset the timer. */}
                  {timer.phase === 'paused' && (
                    <Button
                      size="lg"
                      variant="ghost"
                      onClick={restart}
                      aria-label="Neu starten"
                      className={evening ? '' : 'bg-white/60 text-bark-800'}
                    >
                      <RestartIcon className="h-6 w-6" />
                      Neu
                    </Button>
                  )}
                </div>
                {timer.phase === 'paused' && (
                  <p className="text-lg font-bold opacity-80">
                    Pause. Weiter, wenn du bereit bist.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {askStop && (
        <StopDialog
          elapsed={timer.brushedSeconds()}
          total={totalSeconds}
          onContinue={() => {
            setAskStop(false)
            resume()
          }}
          onCount={() => {
            record(timer.brushedSeconds())
            void navigate({ to: '/' })
          }}
          onDiscard={() => void navigate({ to: '/' })}
        />
      )}
    </main>
  )
}

function Done({
  animal,
  evening,
  onHome,
}: {
  animal: AnimalId
  evening: boolean
  onHome: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-center landscape:flex-row landscape:gap-10 landscape:text-left">
      <div className="flex shrink-0 items-end">
        <svg
          viewBox="-90 -190 180 200"
          className="h-36 w-32 landscape:h-[38vh] landscape:w-auto"
          aria-hidden="true"
        >
          <g className="origin-bottom animate-pop">
            {evening ? (
              <EveningLantern x={-14} y={0} lit s={2} />
            ) : (
              <MorningFlower x={0} y={0} open s={2} />
            )}
          </g>
        </svg>
        <div className="relative w-32 landscape:w-[30vh]">
          <Sparkles />
          <div className="animate-hop">
            <Animal animal={animal} />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 landscape:items-start">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Fertig!</h1>
        <p className="text-xl font-semibold opacity-85">
          Alle vier Ecken sind sauber. {evening ? 'Die Laterne leuchtet.' : 'Die Blume ist offen.'}
        </p>
        <Button size="lg" className="text-2xl" onClick={onHome}>
          Zurück in den Wald
        </Button>
      </div>
    </div>
  )
}

function StopDialog({
  elapsed,
  total,
  onContinue,
  onCount,
  onDiscard,
}: {
  elapsed: number
  total: number
  onContinue: () => void
  onCount: () => void
  onDiscard: () => void
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4">
      <Card className="flex w-full max-w-md animate-fadein flex-col gap-3 text-bark-900">
        <h2 className="text-2xl font-extrabold">Schon aufhören?</h2>
        <p className="font-semibold">
          Du hast {clockLabel(elapsed)} von {clockLabel(total)} geputzt.
        </p>
        <Button size="lg" onClick={onContinue}>
          Weiterputzen
        </Button>
        {elapsed >= total / 2 && (
          <Button size="lg" variant="secondary" onClick={onCount}>
            Als geputzt eintragen
          </Button>
        )}
        <button
          type="button"
          onClick={onDiscard}
          className="mt-2 min-h-11 self-center px-3 font-bold text-bark-600 underline"
        >
          Nicht eintragen
        </button>
      </Card>
    </div>
  )
}

/** Little stars that float up around the animal at the end. */
function Sparkles() {
  const stars = [
    { left: '0%', delay: '0s', size: 18 },
    { left: '20%', delay: '0.6s', size: 12 },
    { left: '45%', delay: '1.1s', size: 20 },
    { left: '70%', delay: '0.3s', size: 14 },
    { left: '90%', delay: '0.9s', size: 16 },
    { left: '35%', delay: '1.6s', size: 10 },
  ]
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-1/3" aria-hidden="true">
      {stars.map((star) => (
        <svg
          key={star.left}
          viewBox="-10 -10 20 20"
          className="absolute animate-rise"
          style={{
            left: star.left,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
          }}
        >
          <path
            d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z"
            fill="#f6c94c"
          />
        </svg>
      ))}
    </div>
  )
}
