import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { CloseIcon, MusicIcon, MusicOffIcon, PauseIcon, PlayIcon } from '@/components/icons'
import { Button, Card } from '@/components/ui'
import { familyStore, useFamily, useFamilyActions } from '@/features/family/family-store'
import { brushingsFor } from '@/features/family/queries'
import type { Brushing } from '@/features/family/schema'
import { Animal, ANIMAL_SUBJECTS } from '@/features/forest/Animal'
import { DoneMoment } from '@/features/forest/DoneMoment'
import { usePhotoReward } from '@/features/photos/use-photo-reward'
import { brushingAudio } from '@/features/timer/audio'
import { MouthDial } from '@/features/timer/MouthDial'
import { brushingSeconds, clockLabel, SECTIONS } from '@/features/timer/sections'
import { useBrushingTimer } from '@/features/timer/use-brushing-timer'
import { allowScreenOff, keepScreenOn } from '@/features/timer/wake-lock'
import { useNow } from '@/hooks/use-now'
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
  // The earlier brushing of this morning or evening, if any, as it was when the page opened.
  const [earlier] = useState(
    () =>
      brushingsFor(familyStore.getState().family, kidId, date, slot).sort((a, b) =>
        a.at < b.at ? -1 : 1,
      )[0],
  )
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
      brushingAudio.stopBrushing()
      if (gong) brushingAudio.finishMelody()
      allowScreenOff()
      record(totalSeconds)
    },
    onAutoPause: () => brushingAudio.stopBrushing(),
  })

  // Only while the child has fields left to uncover; never a "done" state.
  const photo = usePhotoReward(kidId, useNow())

  // Every animal has its own song and corner jingle.
  const animal = kid?.animal
  useEffect(() => {
    if (animal) brushingAudio.setAnimal(animal)
  }, [animal])

  // Leaving the page (back button, navigation) always stops sound and the wake lock.
  useEffect(
    () => () => {
      brushingAudio.stopBrushing()
      allowScreenOff()
    },
    [],
  )

  const start = () => {
    brushingAudio.startBrushing(music)
    void keepScreenOn()
    timer.start()
  }
  const resume = start
  const pause = () => {
    brushingAudio.stopBrushing()
    timer.pause()
  }

  // The Now Playing buttons of iOS (and the lock screen) pause and go on like the buttons here.
  const mediaPlay = useEffectEvent(() => {
    if (timer.phase === 'paused') resume()
  })
  const mediaPause = useEffectEvent(() => {
    if (timer.phase === 'running') pause()
  })
  useEffect(() => {
    brushingAudio.setMediaControls({ play: () => mediaPlay(), pause: () => mediaPause() })
    return () => brushingAudio.setMediaControls(null)
  }, [])

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

  const restart = () => {
    brushingAudio.startBrushing(music)
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
  const subject = kid ? ANIMAL_SUBJECTS[kid.animal] : 'Dein Tier'
  const evening = slot === 'evening'
  const done = timer.phase === 'done'
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

      {/* One stage for every phase: the picture box and the text column keep their size and place,
          the phases only fade their content in and out, so nothing jumps. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] landscape:flex-row landscape:gap-10">
        {/* dial with the animal, and in its place the "Fertig!" scene */}
        <div
          data-testid="brush-picture"
          className="relative h-[min(78vw,46vh)] w-[min(78vw,46vh)] shrink-0 landscape:h-[min(42vw,62vh)] landscape:w-[min(42vw,62vh)]"
        >
          <div className={twMerge('absolute inset-0', fade(!done))}>
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
                    brushing={
                      timer.phase === 'running' && !position.switching ? corner?.jaw : undefined
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          {/* As wide as the dial with the animal around it (-14% to 114%). */}
          {done && (
            <DoneMoment
              animal={kid.animal}
              evening={evening}
              thought={photo.hasFieldsLeft}
              className="absolute left-[-14%] top-1/2 w-[128%] -translate-y-1/2"
            />
          )}
        </div>

        {/* text + buttons: all phases share one grid cell, so the column is as big as the biggest */}
        <div className="grid w-full max-w-md landscape:w-[min(28rem,40vw)]">
          <div className={layer(timer.phase === 'ready')}>
            {/* Only when this morning or evening is already done. */}
            <p className={TOP_LINE}>{earlier ? alreadyBrushed(evening, earlier) : ''}</p>
            <h1 className="text-3xl font-extrabold sm:text-4xl">
              {totalSeconds === 180 ? 'Drei' : 'Zwei'} Minuten, vier Ecken.
            </h1>
            <Button size="xl" onClick={start}>
              <PlayIcon className="h-8 w-8" />
              Los geht’s
            </Button>
          </div>

          <div className={layer(timer.phase === 'running' || timer.phase === 'paused')}>
            {/* The side is the animal's own side, so the line names the animal. The time is for
                adults; the child follows the ring. */}
            <p className={twMerge(TOP_LINE, 'tabular-nums')}>
              {timer.phase === 'paused'
                ? 'Pause'
                : position.switching
                  ? 'Wechseln!'
                  : `${subject} putzt · noch ${clockLabel(position.totalRemaining)}`}
            </p>
            <h1 className="text-4xl font-extrabold sm:text-5xl">{section?.label}</h1>
            {/* "Pause" and "Weiter" share one cell and one size. */}
            <div className="grid">
              <Button
                size="xl"
                variant="secondary"
                onClick={pause}
                aria-label="Pause"
                className={twMerge('col-start-1 row-start-1', fade(timer.phase === 'running'))}
              >
                <PauseIcon className="h-8 w-8" />
                Pause
              </Button>
              <Button
                size="xl"
                onClick={resume}
                className={twMerge('col-start-1 row-start-1', fade(timer.phase === 'paused'))}
              >
                <PlayIcon className="h-8 w-8" />
                Weiter
              </Button>
            </div>
          </div>

          <DoneText
            active={done}
            evening={evening}
            earlier={earlier}
            photo={photo}
            onHome={() => void navigate({ to: '/' })}
            onPhoto={(week) => void navigate({ to: '/foto', search: { week, kid: kid.id } })}
          />
        </div>
      </div>

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
          onRestart={() => {
            setAskStop(false)
            restart()
          }}
          onDiscard={() => void navigate({ to: '/' })}
        />
      )}
    </main>
  )
}

/**
 * The small line above the headline, two lines high and filled from the bottom, so a longer
 * text grows upward and the headline stays in place in every phase.
 */
const TOP_LINE = 'flex min-h-12 flex-col justify-end text-base font-bold opacity-75'

/**
 * Shown or hidden without unmounting, at the same place. Hidden content is `invisible`: it keeps
 * its space but cannot be tapped or focused. Reduced motion shortens the fade (index.css).
 */
function fade(shown: boolean, opacity = 'opacity-100') {
  return twMerge(
    'transition-[opacity,visibility,transform] duration-300',
    shown ? `visible ${opacity}` : 'invisible opacity-0',
  )
}

/** One phase of the text column; all phases lie on top of each other in the same grid cell. */
function layer(shown: boolean) {
  return twMerge(
    'col-start-1 row-start-1 flex flex-col items-center gap-4 self-start text-center landscape:items-start landscape:text-left',
    fade(shown),
  )
}

function DoneText({
  active,
  evening,
  earlier,
  photo,
  onHome,
  onPhoto,
}: {
  active: boolean
  evening: boolean
  earlier: Brushing | undefined
  photo: ReturnType<typeof usePhotoReward>
  onHome: () => void
  onPhoto: (week: string) => void
}) {
  // The staggered fade-in starts when the phase is shown, not when the page opens.
  const appear = (delay: number) =>
    active ? { className: 'animate-fadein', style: { animationDelay: `${delay}s` } } : {}
  const repeat = photo.hasWeekPhoto && !photo.hasFieldsLeft
  const title = appear(0.3)
  const text = appear(0.6)
  const actions = appear(0.9)
  return (
    <div className={twMerge(layer(active), 'gap-3')}>
      <h1
        className={twMerge('text-5xl font-extrabold sm:text-6xl md:text-7xl', title.className)}
        style={title.style}
      >
        Fertig!
      </h1>
      <p
        className={twMerge('max-w-md text-xl font-semibold opacity-85 md:text-2xl', text.className)}
        style={text.style}
      >
        Alle vier Ecken sind sauber. {evening ? 'Die Laterne leuchtet.' : 'Die Blume ist offen.'}
      </p>
      <Button
        size="lg"
        className={twMerge('text-2xl', actions.className)}
        style={actions.style}
        onClick={onHome}
      >
        Zurück in den Wald
      </Button>
      {/* "Zum Foto" or, when brushing the same morning or evening again brings no new fields,
          why not (or the missing button looks like a fault). Both share one slot. */}
      <div className={twMerge('grid', actions.className)} style={actions.style}>
        <Button
          size="lg"
          variant="secondary"
          className={twMerge(
            'col-start-1 row-start-1 min-h-11 cursor-pointer select-none self-start justify-self-center text-2xl landscape:justify-self-start',
            fade(photo.hasFieldsLeft),
          )}
          onClick={() => onPhoto(photo.week)}
        >
          Zum Foto
        </Button>
        <p
          className={twMerge(
            'col-start-1 row-start-1 max-w-md text-base font-semibold',
            fade(repeat, 'opacity-75'),
          )}
        >
          {repeatHint(evening, earlier)}
        </p>
      </div>
    </div>
  )
}

function StopDialog({
  elapsed,
  total,
  onContinue,
  onCount,
  onRestart,
  onDiscard,
}: {
  elapsed: number
  total: number
  onContinue: () => void
  onCount: () => void
  onRestart: () => void
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
        {/* Starting over sits here, two steps away from the main button, so a finger cannot
            reset the timer by mistake. */}
        <button
          type="button"
          onClick={onRestart}
          className="mt-2 min-h-11 cursor-pointer select-none self-center px-3 font-bold text-bark-600 underline"
        >
          Von vorn anfangen
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="min-h-11 cursor-pointer select-none self-center px-3 font-bold text-bark-600 underline"
        >
          Nicht eintragen
        </button>
      </Card>
    </div>
  )
}

/** That this morning or evening was already brushed, and when, if known. */
function alreadyBrushed(evening: boolean, earlier: Brushing): string {
  const when = evening ? 'Heute Abend' : 'Heute Morgen'
  if (earlier.source === 'manual') return `${when} ist schon als geputzt eingetragen.`
  return `${when} hast du schon um ${format(new Date(earlier.at), 'H:mm')} Uhr geputzt.`
}

/** Why a repeated brushing brings no new fields: says when this morning or evening was brushed. */
function repeatHint(evening: boolean, earlier: Brushing | undefined): string {
  if (!earlier)
    return `Die Foto-Felder für ${evening ? 'heute Abend' : 'heute Morgen'} sind schon freigemacht.`
  return `${alreadyBrushed(evening, earlier)} Die Foto-Felder dafür sind schon frei.`
}
