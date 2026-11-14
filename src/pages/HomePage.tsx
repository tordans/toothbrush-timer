import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  GearIcon,
  MoonIcon,
  SunIcon,
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
import type { Animal as AnimalId, Slot, Toothbrush } from '@/features/family/schema'
import { ForestWeek, type DayStatus } from '@/features/forest/ForestWeek'
import { dayLightForSlot, seasonFor } from '@/features/forest/scenery'
import { useElementSize } from '@/hooks/use-element-size'
import { useNow } from '@/hooks/use-now'
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

  const [chosenSlot, setChosenSlot] = useState<Slot | null>(null)
  const [pickingAnimal, setPickingAnimal] = useState(false)
  const slot = chosenSlot ?? slotForTime(now)

  const today = isoDay(now)
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
    }
  })
  const brushedNow = kid ? isBrushed(family, kid.id, today, slot) : false

  const openParents = () => void navigate({ to: '/eltern' })

  return (
    <main className="relative flex h-full w-full touch-manipulation flex-col overflow-hidden">
      <div ref={forestRef} className="relative min-h-0 flex-1">
        <ForestWeek
          days={dayStatus}
          animal={kid?.animal ?? null}
          light={dayLightForSlot(slot, now)}
          season={seasonFor(days[3] ?? now)}
          aspect={forestSize.width / forestSize.height}
          onAnimalTap={kid ? () => setPickingAnimal(true) : undefined}
        />

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
          {/* min-w-0: names shrink first, so the parents' gear always stays on screen */}
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {/* Tap another child to switch; tap the current child to see all months. */}
            {kids.map((k) => {
              const current = k.id === kid?.id
              return (
                <button
                  key={k.id}
                  type="button"
                  aria-label={current ? `${k.name}: alle Monate ansehen` : `${k.name} auswählen`}
                  onClick={() =>
                    current
                      ? void navigate({ to: '/uebersicht', search: { kid: k.id } })
                      : setActiveKid(k.id)
                  }
                  className={twMerge(
                    'flex min-w-0 max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-3 text-lg font-extrabold shadow transition active:scale-95',
                    current ? 'bg-cream text-bark-900' : 'bg-white/40 text-bark-900/70',
                  )}
                >
                  <AnimalBadge animal={k.animal} className="h-10 w-10 bg-white" />
                  <span className="truncate">{k.name}</span>
                  {current && <CalendarIcon className="h-5 w-5 shrink-0 text-bark-600" />}
                </button>
              )
            })}
          </div>
          {/* on narrow screens the gear sits above the week switch */}
          <div className="flex shrink-0 items-center gap-2 max-[399px]:flex-col-reverse max-[399px]:items-end">
            <div className="flex items-center rounded-full bg-cream/90 shadow">
              <button
                type="button"
                aria-label="Woche davor"
                className="p-2.5 transition active:scale-90"
                onClick={() =>
                  void navigate({ to: '/', search: { week: Math.max(week - 1, -52) } })
                }
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <span className="min-w-[5.5rem] text-center text-xs sm:min-w-[7.5rem] sm:text-sm font-bold">
                {week === 0 ? 'Diese Tage' : weekRangeLabel(days)}
              </span>
              <button
                type="button"
                aria-label="Woche danach"
                className="p-2.5 transition active:scale-90 disabled:opacity-30"
                disabled={week === 0}
                onClick={() =>
                  void navigate({ to: '/', search: week + 1 >= 0 ? {} : { week: week + 1 } })
                }
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
            <HoldButton
              onHold={openParents}
              label="Für Eltern: gedrückt halten"
              className="rounded-full bg-cream/90 p-2.5 shadow"
            >
              <GearIcon className="h-6 w-6 text-bark-700" />
            </HoldButton>
          </div>
        </div>
      </div>

      {/* bottom: start brushing (below the forest, so it never hides a day) */}
      {kid ? (
        <div className="flex shrink-0 flex-col items-center justify-center gap-x-5 gap-y-2 bg-moss-800 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3 landscape:flex-row landscape:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex rounded-full bg-cream p-1 shadow-lg" role="radiogroup">
            <SlotButton slot="morning" active={slot === 'morning'} onClick={setChosenSlot} />
            <SlotButton slot="evening" active={slot === 'evening'} onClick={setChosenSlot} />
          </div>
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
    </main>
  )
}

function SlotButton({
  slot,
  active,
  onClick,
}: {
  slot: Slot
  active: boolean
  onClick: (slot: Slot) => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onClick(slot)}
      className={twMerge(
        'flex min-h-11 items-center gap-2 rounded-full px-5 py-2 text-lg font-extrabold transition active:scale-95',
        active
          ? slot === 'morning'
            ? 'bg-sun text-bark-900'
            : 'bg-dusk text-white'
          : 'text-bark-600',
      )}
    >
      {slot === 'morning' ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-5 w-5" />}
      {slot === 'morning' ? 'Morgens' : 'Abends'}
    </button>
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
        <h2 className="text-2xl font-extrabold">Wer putzt mit dir, {name}?</h2>
        <AnimalPicker value={animal} onChange={onPick} />
        <Button variant="secondary" onClick={onClose}>
          So lassen
        </Button>
      </Card>
    </div>
  )
}
