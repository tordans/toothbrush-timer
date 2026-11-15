import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ChevronLeft } from '@/components/icons'
import { AnimalBadge, Button } from '@/components/ui'
import { useActiveKidId, useFamily, useFamilyActions } from '@/features/family/family-store'
import { activeKids } from '@/features/family/queries'
import type { Animal as AnimalId } from '@/features/family/schema'
import { Animal } from '@/features/forest/Animal'
import { AnimalItem } from '@/features/photos/animal-items'
import { usePhotos } from '@/features/photos/photo-store'
import { PhotoBoard, type Run } from '@/features/photos/PhotoBoard'
import { FIELDS, fieldsLeft, photoForWeek, photoGrid } from '@/features/photos/rewards'
import { usePhotoUrl } from '@/features/photos/use-photo-url'
import { brushingAudio } from '@/features/timer/audio'
import { useElementSize } from '@/hooks/use-element-size'
import { useNow } from '@/hooks/use-now'
import { fromIsoDay, weekDays, weekKey, weekRangeLabel } from '@/lib/dates'

const route = getRouteApi('/foto')

/** Space between the photo and the edge of its area, in px. */
const GAP = 12

/**
 * The photo of a week, uncovered field by field. In the current week the child picks covered
 * fields (as many as its brushings earned) and its animal clears them; past weeks only show
 * what was uncovered.
 */
export function PhotoPage() {
  const navigate = useNavigate()
  const family = useFamily()
  const activeKidId = useActiveKidId()
  const { setActiveKid, revealCells } = useFamilyActions()
  const { week: weekParam, kid: kidParam } = route.useSearch()
  const now = useNow()
  const photos = usePhotos()

  const kids = activeKids(family)
  const kid =
    kids.find((k) => k.id === kidParam) ?? kids.find((k) => k.id === activeKidId) ?? kids[0]
  const currentWeek = weekKey(now)
  const week = weekParam ?? currentWeek
  const isCurrent = week === currentWeek
  const info = photoForWeek(family, photos, week, currentWeek)
  const url = usePhotoUrl(info?.photo.id)

  const [marked, setMarked] = useState<number[]>([])
  const [run, setRun] = useState<Run | null>(null)
  const [runCount, setRunCount] = useState(0)
  const [started, setStarted] = useState<number[]>([])
  // The child (and so the animal) of a running reveal stays fixed until it is done.
  const [runKid, setRunKid] = useState<{ id: string; animal: AnimalId } | null>(null)

  const area = useRef<HTMLDivElement>(null)
  const areaSize = useElementSize(area)

  const back = () => void navigate({ to: '/' })

  if (!kid) {
    return (
      <main className="flex h-full items-center justify-center bg-moss-800 p-4">
        <Button onClick={back}>Zurück in den Wald</Button>
      </main>
    )
  }

  const animal = runKid?.animal ?? kid.animal
  const left = info && isCurrent ? fieldsLeft(family, runKid?.id ?? kid.id, week) : 0
  const startedSet = new Set(started)
  const covered = info
    ? Array.from({ length: FIELDS }, (_, i) => i).filter(
        (i) => !info.revealed.has(i) && !startedSet.has(i),
      )
    : []
  // Marks on fields that got uncovered meanwhile (another phone) fall away.
  const marks = marked.filter((i) => !info?.revealed.has(i) && !startedSet.has(i))
  const canMark = isCurrent && !!info && (left > 0 || !!run)

  const start = (cells: number[]) => {
    if (!info || cells.length === 0 || run) return
    setRunKid({ id: kid.id, animal: kid.animal })
    setStarted([])
    setRunCount(runCount + 1)
    setRun({ id: runCount + 1, cells })
  }

  const toggle = (cell: number) => {
    if (run) return
    brushingAudio.unlock()
    if (marks.includes(cell)) {
      setMarked(marks.filter((i) => i !== cell))
      return
    }
    if (marks.length >= left) return
    const next = [...marks, cell]
    setMarked(next)
    // All fields picked: the animal sets off right away.
    if (next.length === left) start(next)
  }

  const onCleared = (cell: number) => {
    if (!info || !runKid) return
    revealCells(week, info.photo.id, runKid.id, [cell])
    if (family.settings.gong) brushingAudio.chime(run?.cells.indexOf(cell) ?? 0)
  }

  const onFinish = () => {
    setRun(null)
    setRunKid(null)
    setMarked([])
    setStarted([])
  }

  const switchKid = (id: string) => {
    if (run) return
    setActiveKid(id)
    setMarked([])
    void navigate({ to: '/foto', search: { week: weekParam, kid: id }, replace: true })
  }

  // Contain-fit the photo into the free area.
  const grid = info ? photoGrid(info.photo) : { cols: 8, rows: 7 }
  const aspect = info ? info.photo.width / info.photo.height : 1
  const freeW = Math.max(0, areaSize.width - GAP * 2)
  const freeH = Math.max(0, areaSize.height - GAP * 2)
  const boardW = Math.floor(Math.min(freeW, freeH * aspect))
  const boardH = Math.floor(boardW / aspect)

  return (
    <main className="flex h-full touch-manipulation select-none flex-col overflow-hidden bg-moss-800 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] landscape:flex-row">
      <aside className="flex shrink-0 flex-col gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] landscape:w-64 landscape:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:landscape:w-80">
        <div className="flex flex-wrap items-center gap-2 landscape:flex-col landscape:items-start">
          <Button variant="ghost" onClick={back}>
            <ChevronLeft className="h-5 w-5" />
            Zurück in den Wald
          </Button>
          {kids.length > 1 && (
            <div className="ml-auto flex flex-wrap gap-2 landscape:ml-0">
              {kids.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  disabled={!!run}
                  onClick={() => switchKid(k.id)}
                  className={twMerge(
                    'flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-4 font-extrabold transition active:scale-95 disabled:opacity-60',
                    k.id === kid.id ? 'bg-cream text-bark-900' : 'bg-white/20 text-cream',
                  )}
                >
                  <AnimalBadge animal={k.animal} className="h-9 w-9 bg-white" />
                  {k.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {info && (
          <Status
            animal={animal}
            isCurrent={isCurrent}
            range={weekRangeLabel(weekDays(week).map(fromIsoDay))}
            left={left}
            marks={marks.length}
            allFree={covered.length === 0 && started.length === 0}
            earnedNone={
              left === 0 &&
              !Object.values(family.weekPhotos[week]?.cells ?? {}).some((c) => c.kidId === kid.id)
            }
            showGo={marks.length > 0 && !run}
            onGo={() => start(marks)}
          />
        )}
      </aside>

      <div
        ref={area}
        className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center pb-[env(safe-area-inset-bottom)] landscape:pt-[env(safe-area-inset-top)]"
      >
        {info ? (
          boardW > 0 && (
            <PhotoBoard
              url={url}
              animal={animal}
              cols={grid.cols}
              rows={grid.rows}
              aspect={aspect}
              width={boardW}
              height={boardH}
              covered={covered}
              marked={canMark ? marks : null}
              onToggle={toggle}
              run={run}
              onClearStart={(cell) => setStarted((s) => [...s, cell])}
              onCleared={onCleared}
              onFinish={onFinish}
            />
          )
        ) : (
          <NoPhoto animal={kid.animal} isCurrent={isCurrent} />
        )}
      </div>
    </main>
  )
}

/** One short line, plus the fields left as little items for children who do not read yet. */
function Status({
  animal,
  isCurrent,
  range,
  left,
  marks,
  allFree,
  earnedNone,
  showGo,
  onGo,
}: {
  animal: AnimalId
  isCurrent: boolean
  /** The days of the week, shown for past weeks. */
  range: string
  left: number
  marks: number
  allFree: boolean
  earnedNone: boolean
  showGo: boolean
  onGo: () => void
}) {
  let text: string
  if (allFree) text = 'Das ganze Bild ist frei!'
  else if (!isCurrent) text = 'Diese Woche ist vorbei'
  else if (left === 1) text = 'Noch 1 Feld zum Freimachen'
  else if (left > 0) text = `Noch ${left} Felder zum Freimachen`
  else if (earnedNone) text = 'Nach dem Zähneputzen darfst du Felder freimachen'
  else text = 'Alles freigemacht bis zum nächsten Putzen'

  const icons = Math.min(left, 8)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-1 text-cream landscape:flex-col landscape:items-start">
      <div className="flex flex-col gap-1">
        <p className="text-xl font-extrabold sm:text-2xl">{text}</p>
        {!isCurrent && <p className="font-bold opacity-75">{range}</p>}
        {icons > 0 && (
          <div className="flex flex-wrap gap-1" aria-hidden="true">
            {Array.from({ length: icons }, (_, i) => (
              <AnimalItem
                key={i}
                animal={animal}
                className={twMerge(
                  'h-8 w-8 transition-opacity sm:h-10 sm:w-10',
                  i < marks ? 'opacity-30' : 'drop-shadow',
                  i === marks && 'animate-bob',
                )}
              />
            ))}
          </div>
        )}
      </div>
      {showGo && (
        <Button size="xl" onClick={onGo} className="ml-auto animate-pop landscape:ml-0">
          Los!
        </Button>
      )}
    </div>
  )
}

/** A calm empty state: no photo for this week (none uploaded, none left, or deleted). */
function NoPhoto({ animal, isCurrent }: { animal: AnimalId; isCurrent: boolean }) {
  return (
    <div className="flex max-w-sm flex-col items-center gap-4 p-6 text-center text-cream">
      <Animal animal={animal} className="h-32 w-32 animate-bob" />
      <p className="text-2xl font-extrabold">
        {isCurrent ? 'Diese Woche gibt es noch kein Bild.' : 'Für diese Woche gibt es kein Bild.'}
      </p>
      {isCurrent && (
        <p className="text-lg font-semibold opacity-80">
          Deine Eltern können neue Bilder hochladen.
        </p>
      )}
    </div>
  )
}
