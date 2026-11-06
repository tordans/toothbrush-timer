import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { addMonths, eachDayOfInterval, endOfMonth, format, getISODay, startOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'
import { useEffect, useRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { ChevronLeft } from '@/components/icons'
import { AnimalBadge, Button } from '@/components/ui'
import { useActiveKidId, useFamily, useFamilyActions } from '@/features/family/family-store'
import { activeKids } from '@/features/family/queries'
import type { FamilyState } from '@/features/family/schema'
import { useNow } from '@/hooks/use-now'
import { fromIsoDay, isoDay } from '@/lib/dates'

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
  const firstDay = [...done.keys()].sort()[0] ?? today
  const months: Date[] = []
  for (let m = startOfMonth(fromIsoDay(firstDay)); m <= now; m = addMonths(m, 1)) months.push(m)
  const years = [...new Set(months.map((m) => m.getFullYear()))]

  return (
    <main className="h-full overflow-y-auto bg-moss-800">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-moss-800/95 p-3 backdrop-blur-sm">
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
                'flex items-center gap-2 rounded-full py-1 pl-1 pr-4 font-extrabold',
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
                <MonthCard key={month.toISOString()} month={month} done={done} today={today} />
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
}: {
  month: Date
  done: Map<string, Done>
  today: string
}) {
  const days = eachDayOfInterval({ start: month, end: endOfMonth(month) })
  const leading = getISODay(month) - 1
  return (
    <article className="rounded-3xl bg-cream p-3 shadow-lg sm:p-4">
      <h3 className="mb-2 px-1 text-xl font-extrabold">{format(month, 'MMMM', { locale: de })}</h3>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-xs font-bold text-bark-500">
            {d}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const key = isoDay(day)
          const state = done.get(key) ?? { morning: false, evening: false }
          const future = key > today
          return (
            <div
              key={key}
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
                  <MiniFlower open={state.morning} />
                  <MiniLantern lit={state.evening} />
                </span>
              )}
            </div>
          )
        })}
      </div>
    </article>
  )
}

/** Small versions of the forest signs: open flower = morning brushed, lit lantern = evening. */
function MiniFlower({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="-10 -12 20 22"
      className="h-5 w-5 sm:h-7 sm:w-7"
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

function MiniLantern({ lit }: { lit: boolean }) {
  return (
    <svg
      viewBox="-10 -12 20 22"
      className="h-5 w-5 sm:h-7 sm:w-7"
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
