import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { addMonths, eachDayOfInterval, endOfMonth, format, getISODay, startOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { Fragment, useEffect, useRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { ChevronLeft } from '@/components/icons'
import { AnimalBadge, Button } from '@/components/ui'
import { useActiveKidId, useFamily, useFamilyActions } from '@/features/family/family-store'
import { activeKids } from '@/features/family/queries'
import type { FamilyState } from '@/features/family/schema'
import { usePhotos } from '@/features/photos/photo-store'
import { photoForWeek, photosEnabled, type WeekPhotoInfo } from '@/features/photos/rewards'
import { WeekThumb } from '@/features/photos/WeekThumb'
import { useNow } from '@/hooks/use-now'
import { fromIsoDay, isoDay, weekKey } from '@/lib/dates'

const route = getRouteApi('/uebersicht')

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

type Done = { morning: boolean; evening: boolean }

/** Which slots are brushed per day for one child: `YYYY-MM-DD` → morning/evening. */
function doneByDay(family: FamilyState, kidId: string): Map<string, Done> {
  const map = new Map<string, Done>()
  for (const b of Object.values(family.brushings)) {
    if (b.deleted || b.kidId !== kidId) continue
    const entry = map.get(b.date) ?? { morning: false, evening: false }
    entry[b.slot] = true
    map.set(b.date, entry)
  }
  return map
}

/**
 * Every month from the first brushing until now, one card per month, grouped by year. The same
 * signs as in the forest: an open flower for the morning, a lit lantern for the evening.
 */
export function OverviewPage() {
  const navigate = useNavigate()
  const family = useFamily()
  const photos = usePhotos()
  const activeKidId = useActiveKidId()
  const { setActiveKid } = useFamilyActions()
  const { kid: kidParam } = route.useSearch()
  const now = useNow()
  const kids = activeKids(family)
  const kid =
    kids.find((k) => k.id === kidParam) ?? kids.find((k) => k.id === activeKidId) ?? kids[0]
  const bottom = useRef<HTMLDivElement>(null)

  // Open at the current month (the end of the list).
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [kid?.id])

  if (!kid) {
    return (
      <main className="flex h-full items-center justify-center bg-moss-800 p-4">
        <Button onClick={() => void navigate({ to: '/' })}>Zurück in den Wald</Button>
      </main>
    )
  }

  const done = doneByDay(family, kid.id)
  const today = isoDay(now)
  const currentWeek = weekKey(now)
  const firstDay = [...done.keys()].sort()[0] ?? today
  const months: Date[] = []
  for (let m = startOfMonth(fromIsoDay(firstDay)); m <= now; m = addMonths(m, 1)) months.push(m)
  const years = [...new Set(months.map((m) => m.getFullYear()))]

  return (
    <main className="h-full touch-manipulation overflow-y-auto bg-moss-800 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-moss-800/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm">
        <Button variant="ghost" onClick={() => void navigate({ to: '/' })}>
          <ChevronLeft className="h-5 w-5" />
          Zurück in den Wald
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          {kids.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                setActiveKid(k.id)
                void navigate({ to: '/uebersicht', search: { kid: k.id }, replace: true })
              }}
              className={twMerge(
                'flex items-center gap-2 rounded-full py-1 pl-1 pr-4 font-extrabold transition active:scale-95',
                k.id === kid.id ? 'bg-cream text-bark-900' : 'bg-white/20 text-cream',
              )}
            >
              <AnimalBadge animal={k.animal} className="h-9 w-9 bg-white" />
              {k.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-10">
        {years.map((year) => (
          <section key={year} className="flex flex-col gap-4">
            <h2 className="pt-2 text-3xl font-extrabold text-cream">{year}</h2>
            {months
              .filter((m) => m.getFullYear() === year)
              .map((month) => (
                <MonthCard
                  key={month.toISOString()}
                  month={month}
                  done={done}
                  today={today}
                  weekPhoto={(week) =>
                    photosEnabled(photos) ? photoForWeek(family, photos, week, currentWeek) : null
                  }
                  onOpenPhoto={(week) =>
                    void navigate({ to: '/foto', search: { week, kid: kid.id } })
                  }
                />
              ))}
          </section>
        ))}
        <div ref={bottom} />
      </div>
    </main>
  )
}

function MonthCard({
  month,
  done,
  today,
  weekPhoto,
  onOpenPhoto,
}: {
  month: Date
  done: Map<string, Done>
  today: string
  weekPhoto: (week: string) => WeekPhotoInfo | null
  onOpenPhoto: (week: string) => void
}) {
  const days = eachDayOfInterval({ start: month, end: endOfMonth(month) })
  const leading = getISODay(month) - 1
  // After every row (Monday to Sunday, or the part of it in this month) comes the week's photo.
  const rowWeeks = [...new Set(days.map((d) => weekKey(d)))]
  const photos = new Map(rowWeeks.map((w) => [w, weekPhoto(w)] as const))
  const thumbs = [...photos.values()].some(Boolean)
  const trailing = (7 - ((leading + days.length) % 7)) % 7

  const thumbCell = (week: string) => {
    const info = photos.get(week)
    return (
      <div key={`photo-${week}`} className="flex items-center justify-center">
        {info && (
          <WeekThumb
            info={info}
            label={`Foto der Woche ab ${format(fromIsoDay(week), 'd. MMMM', { locale: de })}`}
            onOpen={() => onOpenPhoto(week)}
          />
        )}
      </div>
    )
  }

  return (
    <article className="rounded-3xl bg-cream p-3 shadow-lg sm:p-4">
      <h3 className="mb-2 px-1 text-xl font-extrabold">{format(month, 'MMMM', { locale: de })}</h3>
      <div
        className={twMerge(
          'grid gap-1 text-center',
          thumbs ? 'grid-cols-[repeat(7,minmax(0,1fr))_2.75rem]' : 'grid-cols-7',
        )}
      >
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-xs font-bold text-bark-500">
            {d}
          </span>
        ))}
        {thumbs && <span />}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const key = isoDay(day)
          const state = done.get(key) ?? { morning: false, evening: false }
          const future = key > today
          return (
            <Fragment key={key}>
              <div
                className={twMerge(
                  'flex flex-col items-center rounded-xl pb-1 pt-0.5',
                  state.morning && state.evening ? 'bg-[#c8e39a]' : 'bg-moss-100',
                  key === today && 'ring-2 ring-sun',
                  future && 'opacity-40',
                )}
              >
                <span className="text-xs font-bold text-bark-700">{day.getDate()}</span>
                {!future && (
                  <span className="flex items-end gap-0.5">
                    <MiniFlower open={state.morning} compact={thumbs} />
                    <MiniLantern lit={state.evening} compact={thumbs} />
                  </span>
                )}
              </div>
              {thumbs && getISODay(day) === 7 && thumbCell(weekKey(day))}
            </Fragment>
          )
        })}
        {thumbs && trailing > 0 && (
          <>
            {Array.from({ length: trailing }, (_, i) => (
              <span key={`end-${i}`} />
            ))}
            {thumbCell(weekKey(days[days.length - 1]!))}
          </>
        )}
      </div>
    </article>
  )
}

const ICON = 'h-5 w-5 sm:h-7 sm:w-7'
/** With a photo column next to the days the icons are a little smaller on phones. */
const ICON_COMPACT =
  'h-3.5 w-3.5 min-[360px]:h-4 min-[360px]:w-4 min-[420px]:h-5 min-[420px]:w-5 sm:h-7 sm:w-7'

/** Small versions of the forest signs: open flower = morning brushed, lit lantern = evening. */
function MiniFlower({ open, compact }: { open: boolean; compact?: boolean }) {
  return (
    <svg
      viewBox="-10 -12 20 22"
      className={compact ? ICON_COMPACT : ICON}
      aria-label={open ? 'Morgens geputzt' : 'Morgens nicht geputzt'}
    >
      <path d="M0 10 L0 0" stroke="#5a8a3c" strokeWidth="2" />
      {open ? (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-5"
              rx="2.6"
              ry="4"
              fill="#f6c94c"
              transform={`rotate(${i * 60} 0 -1)`}
            />
          ))}
          <circle cx="0" cy="-1" r="2.6" fill="#c9792e" />
        </>
      ) : (
        <path d="M0 -6 C-3.5 -3 -3.5 1 0 2 C3.5 1 3.5 -3 0 -6 Z" fill="#a8c47c" />
      )}
    </svg>
  )
}

function MiniLantern({ lit, compact }: { lit: boolean; compact?: boolean }) {
  return (
    <svg
      viewBox="-10 -12 20 22"
      className={compact ? ICON_COMPACT : ICON}
      aria-label={lit ? 'Abends geputzt' : 'Abends nicht geputzt'}
    >
      {lit && <circle cx="0" cy="0" r="9" fill="#ffd27a" opacity="0.45" />}
      <path d="M-1 -9 L1 -9 L1 -6 L-1 -6 Z" fill="#4e352a" />
      <path
        d="M-5 -6 L5 -6 L6 6 L-6 6 Z"
        fill={lit ? '#ffcf6b' : '#d8d2c4'}
        stroke="#4e352a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M-7 6 L7 6 L6 9 L-6 9 Z" fill="#4e352a" />
    </svg>
  )
}
