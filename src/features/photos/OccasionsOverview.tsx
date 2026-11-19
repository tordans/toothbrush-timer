import { addDays, parseISO } from 'date-fns'
import { twMerge } from 'tailwind-merge'
import { useFamily } from '@/features/family/family-store'
import { useNow } from '@/hooks/use-now'
import { weekKey, weekRangeLabel } from '@/lib/dates'
import { occasionName, occasionsOfWeek, type OccasionId } from './occasions'
import { usePhotos } from './photo-store'
import { photoOccasion, unusedPhotos } from './rewards'

/** How far ahead the list looks: a year, so Easter and Halloween show up early enough. */
const WEEKS_AHEAD = 52

type Row = { week: string; occasion: OccasionId; ready: boolean; running: boolean }

/**
 * The coming weeks with an occasion and whether a photo is kept for each. Kept photos fill the
 * weeks of their occasion in order, so two Advent weeks need two Wichtel photos.
 */
export function OccasionsOverview() {
  const family = useFamily()
  const photos = usePhotos()
  const now = useNow()
  const currentWeek = weekKey(now)

  const kept = new Map<string, number>()
  for (const p of unusedPhotos(family, photos)) {
    const occasion = photoOccasion(family, p.id)
    if (occasion) kept.set(occasion, (kept.get(occasion) ?? 0) + 1)
  }

  const rows: Row[] = []
  const used = new Map<string, number>()
  for (let i = 0; i < WEEKS_AHEAD; i++) {
    const week = weekKey(addDays(parseISO(currentWeek), i * 7))
    const occasion = occasionsOfWeek(week)[0]
    if (!occasion) continue
    // A week that already shows its photo does not need a kept one any more.
    const running = week === currentWeek && Boolean(family.weekPhotos[week])
    const n = used.get(occasion) ?? 0
    const ready = running || n < (kept.get(occasion) ?? 0)
    if (!running) used.set(occasion, n + 1)
    rows.push({ week, occasion, ready, running })
  }

  return (
    <>
      <p className="text-sm text-bark-700">
        Für diese Wochen könnt ihr ein passendes Foto vorbereiten. Wählt dafür bei einem Foto oben
        den Anlass aus. Es wartet dann auf seine Woche und wird vorher nicht verbraucht. Ohne
        eigenes Foto bekommt die Woche einfach das nächste normale Foto.
      </p>
      <ul className="flex flex-col divide-y divide-bark-100 rounded-2xl bg-white">
        {rows.map((row) => {
          const monday = parseISO(row.week)
          const days = [monday, addDays(monday, 6)]
          return (
            <li key={row.week} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-col">
                <span className="font-extrabold">{occasionName(row.occasion)}</span>
                <span className="text-sm text-bark-600">{weekRangeLabel(days)}</span>
              </div>
              <span
                className={twMerge(
                  'shrink-0 rounded-full px-3 py-1 text-sm font-bold',
                  row.ready ? 'bg-moss-100 text-moss-800' : 'bg-bark-100 text-bark-700',
                )}
              >
                {row.running ? 'Läuft gerade' : row.ready ? 'Foto bereit' : 'Noch kein Foto'}
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}
