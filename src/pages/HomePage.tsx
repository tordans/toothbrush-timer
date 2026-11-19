import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  CalendarIcon,
  ChevronLeft,
  CloseIcon,
  ChevronRight,
  FrameIcon,
  GearIcon,
} from '@/components/icons'
import {
  AnimalBadge,
  AnimalPicker,
  Button,
  Card,
  HoldButton,
  ToothbrushPicker,
} from '@/components/ui'
import { useActiveKidId, useFamily, useFamilyActions } from '@/features/family/family-store'
import { activeKids, isBrushed } from '@/features/family/queries'
import type { Animal as AnimalId, Toothbrush } from '@/features/family/schema'
import { ForestWeek, type DayStatus } from '@/features/forest/ForestWeek'
import { dayLightForSlot, seasonFor, SKY } from '@/features/forest/scenery'
import { ParentGateDialog } from '@/features/parent-gate/ParentGateDialog'
import { ParentHintDialog } from '@/features/parent-gate/ParentHintDialog'
import { occasionName } from '@/features/photos/occasions'
import { usePhotoReward } from '@/features/photos/use-photo-reward'
import { useElementSize } from '@/hooks/use-element-size'
import { useNow } from '@/hooks/use-now'
import { useThemeColor } from '@/hooks/use-theme-color'
import { daysAround, isoDay, slotForTime, weekdayShort, weekRangeLabel } from '@/lib/dates'

const route = getRouteApi('/')

export function HomePage() {
  const family = useFamily()
  const activeKidId = useActiveKidId()
  const { setActiveKid, updateKid } = useFamilyActions()
  const now = useNow()
  const forestRef = useRef<HTMLDivElement>(null)
  const forestSize = useElementSize(forestRef)
  const navigate = useNavigate()
  const { week = 0 } = route.useSearch()

  const kids = activeKids(family)
  const kid = kids.find((k) => k.id === activeKidId) ?? kids[0]

  const [pickingAnimal, setPickingAnimal] = useState(false)
  // Holding the gear only opens the parent gate; /eltern comes after the right animal is tapped.
  const [gateOpen, setGateOpen] = useState(false)
  // Where the parents' question leads: the photos tab when it was opened from a hint.
  const [gateTarget, setGateTarget] = useState<'putzen' | 'fotos'>('putzen')
  const [hintOpen, setHintOpen] = useState(false)
  const slot = slotForTime(now)
  const light = dayLightForSlot(slot, now)
  // Name and week stand right on the sky: dark text by day, light text in the evening and at night.
  const labelColor =
    light === 'evening' || light === 'night'
      ? 'text-cream [text-shadow:0_1px_3px_rgb(0_0_0/0.45)]'
      : 'text-bark-900 [text-shadow:0_1px_2px_rgb(255_255_255/0.6)]'
  useThemeColor(SKY[light][0])

  const today = isoDay(now)
  const photo = usePhotoReward(kid?.id, now)
  const days = daysAround(now, week)
  const dayStatus: DayStatus[] = days.map((d) => {
    const key = isoDay(d)
    return {
      key,
      label: weekdayShort(d),
      dayOfMonth: d.getDate(),
      morning: kid ? isBrushed(family, kid.id, key, 'morning') : false,
      evening: kid ? isBrushed(family, kid.id, key, 'evening') : false,
      isToday: key === today,
      isFuture: key > today,
      isPast: key < today,
      photoFieldsLeft: photo.daysWithFields.has(key),
    }
  })
  const brushedNow = kid ? isBrushed(family, kid.id, today, slot) : false

  const openParents = () =>
    void navigate({ to: '/eltern', search: gateTarget === 'fotos' ? { tab: 'fotos' } : {} })
  const occasion = photo.occasionWithoutPhoto
  const parentHints = [
    photo.needsNewPhotos &&
      'Für nächste Woche ist kein Foto mehr da. Bitte ladet im Elternbereich unter „Fotos“ neue hoch.',
    occasion &&
      `Nächste Woche ist ${occasionName(occasion)}. Wenn ihr mögt, bereitet ein passendes Foto vor: im Elternbereich unter „Fotos“ hochladen und „${occasionName(occasion)}“ auswählen. Ohne bekommt die Woche ein normales Foto.`,
  ].filter((h): h is string => Boolean(h))
  const openPhoto = (photoWeek?: string, kidId?: string) =>
    navigate({ to: '/foto', search: { week: photoWeek, kid: kidId } })

  return (
    <main className="relative flex h-full w-full touch-manipulation flex-col overflow-hidden">
      <div ref={forestRef} className="relative min-h-0 flex-1">
        <ForestWeek
          days={dayStatus}
          animal={kid?.animal ?? null}
          light={light}
          season={seasonFor(days[3] ?? now)}
          aspect={forestSize.width / forestSize.height}
          onAnimalTap={kid ? () => setPickingAnimal(true) : undefined}
          onPhotoTap={
            kid && photo.hasFieldsLeft ? () => void openPhoto(photo.week, kid.id) : undefined
          }
        />

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
          {/* min-w-0: names shrink first, so the parents' gear always stays on screen */}
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {kid && (
              <>
                {/* The calendar: all months of this child. */}
                <button
                  type="button"
                  aria-label={`Alle Monate von ${kid.name} ansehen`}
                  onClick={() => void navigate({ to: '/uebersicht', search: { kid: kid.id } })}
                  className="flex h-12 w-12 shrink-0 cursor-pointer select-none items-center justify-center rounded-full bg-cream text-bark-700 shadow transition active:scale-90"
                >
                  <CalendarIcon className="h-6 w-6" />
                </button>
                {/* The photo of the week, when there is one. */}
                {photo.hasWeekPhoto && (
                  <button
                    type="button"
                    aria-label="Foto der Woche ansehen"
                    onClick={() => void openPhoto(photo.week, kid.id)}
                    className="flex h-12 w-12 shrink-0 cursor-pointer touch-manipulation select-none items-center justify-center rounded-full bg-cream text-bark-700 shadow transition active:scale-90"
                  >
                    <FrameIcon className="h-6 w-6" />
                  </button>
                )}
                {/* The animal: same as tapping the animal in the forest, opens the animal choice. */}
                <button
                  type="button"
                  aria-label={`Tier für ${kid.name} wählen`}
                  onClick={() => setPickingAnimal(true)}
                  className="shrink-0 cursor-pointer select-none rounded-full shadow transition active:scale-90"
                >
                  <AnimalBadge animal={kid.animal} className="h-12 w-12 bg-white" />
                </button>
                {/* The name is only a label. */}
                <span
                  className={twMerge(
                    'min-w-0 self-center truncate text-xl font-extrabold',
                    labelColor,
                  )}
                >
                  {kid.name}
                </span>
              </>
            )}
            {/* With several children: the others, to switch. */}
            {kids
              .filter((k) => k.id !== kid?.id)
              .map((k) => (
                <button
                  key={k.id}
                  type="button"
                  aria-label={`${k.name} auswählen`}
                  onClick={() => setActiveKid(k.id)}
                  className="flex min-w-0 max-w-full cursor-pointer select-none items-center gap-2 rounded-full bg-cream/75 py-1 pl-1 pr-3 text-lg font-extrabold text-bark-800 shadow transition active:scale-95"
                >
                  <AnimalBadge animal={k.animal} className="h-10 w-10 bg-white" />
                  <span className="truncate">{k.name}</span>
                </button>
              ))}
          </div>
          {/* on narrow screens the gear sits above the week switch */}
          <div className="flex shrink-0 items-center gap-2 max-[399px]:flex-col-reverse max-[399px]:items-end">
            <div className="flex items-center">
              {/* Which days the forest shows, between the arrows on one cream pill, so it stays
                  readable on any sky; the arrows are full 44 px touch targets. */}
              <div className="flex items-center rounded-full bg-cream/90 text-bark-800 shadow">
                <button
                  type="button"
                  aria-label="Woche davor"
                  className="flex h-11 w-11 cursor-pointer select-none items-center justify-center transition active:scale-90"
                  onClick={() =>
                    void navigate({ to: '/', search: { week: Math.max(week - 1, -52) } })
                  }
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="whitespace-nowrap text-sm font-extrabold sm:text-base">
                  {week === 0 ? 'Diese Tage' : weekRangeLabel(days)}
                </span>
                <button
                  type="button"
                  aria-label="Woche danach"
                  className="flex h-11 w-11 cursor-pointer select-none items-center justify-center transition active:scale-90 disabled:opacity-30"
                  disabled={week === 0}
                  onClick={() =>
                    void navigate({ to: '/', search: week + 1 >= 0 ? {} : { week: week + 1 } })
                  }
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* The hint opens with a plain tap: it only tells, the parents' area stays behind
                  the question. */}
              {parentHints.length > 0 && (
                <button
                  type="button"
                  aria-label="Hinweis für Eltern"
                  onClick={() => setHintOpen(true)}
                  className="flex h-11 w-11 cursor-pointer select-none items-center justify-center rounded-full bg-[#f4a62a] text-xl font-extrabold text-bark-900 shadow ring-2 ring-cream transition active:scale-90"
                >
                  !
                </button>
              )}
              <HoldButton
                ms={500}
                onHold={() => {
                  setGateTarget('putzen')
                  setGateOpen(true)
                }}
                label="Für Eltern: gedrückt halten"
                className="rounded-full bg-cream/90 p-2.5 shadow"
              >
                <GearIcon className="h-6 w-6 text-bark-700" />
              </HoldButton>
            </div>
          </div>
        </div>
      </div>

      {/* bottom: start brushing (below the forest, so it never hides a day) */}
      {kid ? (
        <div className="flex shrink-0 flex-col items-center justify-center gap-x-5 gap-y-2 bg-moss-800 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3 landscape:flex-row landscape:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            size="lg"
            className="text-2xl"
            onClick={() => void navigate({ to: '/putzen', search: { kid: kid.id, slot } })}
          >
            Zähne putzen
          </Button>
          {brushedNow && (
            <p className="text-sm font-bold text-moss-100">
              {slot === 'morning' ? 'Heute Morgen' : 'Heute Abend'} schon geputzt.
            </p>
          )}
        </div>
      ) : (
        <FirstKid />
      )}

      {kid && pickingAnimal && (
        <AnimalDialog
          name={kid.name}
          animal={kid.animal}
          onPick={(animal) => {
            updateKid(kid.id, { animal })
            setPickingAnimal(false)
          }}
          onClose={() => setPickingAnimal(false)}
        />
      )}

      {hintOpen && (
        <ParentHintDialog
          hints={parentHints}
          onOpenParents={() => {
            setHintOpen(false)
            setGateTarget('fotos')
            setGateOpen(true)
          }}
          onClose={() => setHintOpen(false)}
        />
      )}
      {gateOpen && <ParentGateDialog onPass={openParents} onClose={() => setGateOpen(false)} />}
    </main>
  )
}

function FirstKid() {
  const { addKid } = useFamilyActions()
  const [name, setName] = useState('')
  const [animal, setAnimal] = useState<AnimalId>('fox')
  const [toothbrush, setToothbrush] = useState<Toothbrush | null>(null)

  return (
    <div className="absolute inset-0 flex overflow-y-auto bg-moss-950/30 p-4">
      <Card className="m-auto w-full max-w-lg animate-fadein">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim() && toothbrush) addKid(name.trim(), animal, toothbrush)
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-sm font-bold text-moss-600">
            brush.ingsparks.de – Zahnputz-Timer für Kinder
          </p>
          <h1 className="text-2xl font-extrabold">Wer putzt hier die Zähne?</h1>
          <label className="flex flex-col gap-1 font-bold">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="rounded-2xl border-2 border-bark-200 bg-white px-4 py-3 text-xl font-bold"
              placeholder="Vorname"
            />
          </label>
          <div className="flex flex-col gap-1 font-bold">
            Welches Tier putzt mit?
            <AnimalPicker value={animal} onChange={setAnimal} />
          </div>
          <div className="flex flex-col gap-1 font-bold">
            Womit wird geputzt?
            <ToothbrushPicker value={toothbrush} onChange={setToothbrush} />
          </div>
          <Button type="submit" size="lg" disabled={!name.trim() || !toothbrush}>
            In den Wald
          </Button>
          <p className="text-sm text-bark-600">
            Weitere Kinder, die Woche korrigieren und das zweite Handy verbinden: Zahnrad oben
            rechts gedrückt halten.
          </p>
        </form>
      </Card>
    </div>
  )
}

/** The child picks the animal that brushes along (tap the animal in the forest). */
function AnimalDialog({
  name,
  animal,
  onPick,
  onClose,
}: {
  name: string
  animal: AnimalId
  onPick: (animal: AnimalId) => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute inset-0 flex overflow-y-auto bg-moss-950/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card className="m-auto flex w-full max-w-lg animate-fadein flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-extrabold">Wer putzt mit dir, {name}?</h2>
          {/* Tapping an animal takes it at once; this only closes without a change. */}
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer select-none items-center justify-center rounded-full bg-moss-50 text-bark-700 transition active:scale-90"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <AnimalPicker value={animal} onChange={onPick} />
      </Card>
    </div>
  )
}
