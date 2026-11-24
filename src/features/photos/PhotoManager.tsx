import { useEffect, useState, type ChangeEvent } from 'react'
import { twMerge } from 'tailwind-merge'
import { useFamily, useFamilyActions, useFamilyKey } from '@/features/family/family-store'
import { useNow } from '@/hooks/use-now'
import { weekKey, weekLabel, weekNumber, weekRangeShort, weekYear } from '@/lib/dates'
import type { Photo } from './api'
import { MovePhotoDialog } from './MovePhotoDialog'
import { occasionName } from './occasions'
import { usePhotoActions, usePhotos, useRecentPhotoIds, useUploadProgress } from './photo-store'
import { PhotoThumb } from './PhotoThumb'
import { needsNewPhotos, photoOccasion, photoPin, planWeeks, type WeekPlan } from './rewards'

/** The server keeps at most this many photos per family (see docs/central-storage.md). */
const SERVER_LIMIT = 300

/** How far ahead the plan looks: a year, so Easter and Halloween show up early enough. */
const WEEKS_AHEAD = 52

/** The list shows at least this many weeks after the current one. */
const MIN_WEEKS_SHOWN = 8

type Upload = NonNullable<ReturnType<typeof useUploadProgress>>

const photoCount = (n: number) => (n === 1 ? '1 Foto' : `${n} Fotos`)

/** The Wichtel are the only occasion whose name does not fit "kein eigenes … -Foto". */
const shortOccasionName = (id: string) => (id === 'advent' ? 'Wichtel' : occasionName(id))

const secondaryButton =
  'inline-flex min-h-11 cursor-pointer select-none items-center justify-center rounded-full bg-bark-100 px-4 py-2 text-sm font-extrabold text-bark-800 transition-transform active:scale-95 disabled:opacity-50'

/** Parents' part of the reward photos: upload, the plan for the coming weeks, move and delete. */
export function PhotoManager() {
  const key = useFamilyKey()
  const now = useNow()
  const family = useFamily()
  const photos = usePhotos()
  const upload = useUploadProgress()
  const recent = useRecentPhotoIds()
  const { add, remove, refresh, clearRecent } = usePhotoActions()
  const { setPhotoWeek } = useFamilyActions()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  /** The week a photo is being uploaded for; its row shows the status. */
  const [uploadWeek, setUploadWeek] = useState<string | null>(null)

  useEffect(() => {
    if (key) void refresh(key)
  }, [key, refresh])

  if (!key) {
    return (
      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-bark-700">
        Belohnungsfotos brauchen die Verbindung zur Familie, damit die Fotos auf allen Handys
        ankommen. Verbindet dieses Gerät zuerst mit eurer Familie.
      </p>
    )
  }

  const currentWeek = weekKey(now)
  const uploading = upload !== null && upload.done < upload.total
  const hasPhotos = (photos?.length ?? 0) > 0

  const plan = planWeeks(family, photos, currentWeek, WEEKS_AHEAD + 1)
  // Weeks up to the last one with a planned photo (and one more), at least a couple of months.
  // Photos kept for an occasion show up under "Später im Jahr", in their own week.
  let lastPlanned = -1
  plan.forEach((entry, i) => {
    if (entry.photo && entry.source !== 'occasion') lastPlanned = i
  })
  const shownEnd = Math.min(Math.max(lastPlanned + 1, MIN_WEEKS_SHOWN), WEEKS_AHEAD)
  const main = plan.slice(0, shownEnd + 1)
  const later = plan.slice(shownEnd + 1).filter((entry) => entry.occasion)

  const needsNew = needsNewPhotos(family, photos, currentWeek)
  const coverage = coverageLabel(plan, currentWeek)
  const missingWichtel = plan.filter(
    (e) => e.occasion === 'advent' && (e.source === null || e.source === 'regular'),
  ).length
  const placed = new Set(plan.map((e) => e.photo?.id))
  const waiting = (photos ?? []).filter(
    (p) => !placed.has(p.id) && !Object.values(family.weekPhotos).some((w) => w.photoId === p.id),
  ).length

  // Photo id → the (latest) week that showed it.
  const weekOf = new Map<string, string>()
  for (const [week, w] of Object.entries(family.weekPhotos)) {
    const known = weekOf.get(w.photoId)
    if (!known || known < week) weekOf.set(w.photoId, week)
  }
  const past = [...weekOf.entries()]
    .filter(([id, week]) => week < currentWeek && photos?.some((p) => p.id === id))
    .sort(([, a], [, b]) => (a < b ? 1 : -1))
    .flatMap(([id, week]) => {
      const photo = photos?.find((p) => p.id === id)
      return photo ? [{ photo, week }] : []
    })

  const startUpload = async (files: File[], week?: string) => {
    if (files.length === 0) return
    setUploadWeek(week ?? null)
    const added = await add(key, files)
    // One photo per week: the first file takes it, the others go into the normal order.
    const first = added[0]
    if (week && first) {
      setPhotoWeek(first.id, week)
      setUploadWeek(null)
    }
  }

  const onFiles = (e: ChangeEvent<HTMLInputElement>, week?: string) => {
    const files = Array.from(e.currentTarget.files ?? [])
    // Reset, so choosing the same photos again still fires `change`.
    e.currentTarget.value = ''
    void startUpload(week ? files.slice(0, 1) : files, week)
  }

  /** Asks, deletes, and says whether the photo is gone. */
  const onDelete = async (photo: Photo): Promise<boolean> => {
    const week = weekOf.get(photo.id)
    const question = week
      ? `Dieses Foto war in der Woche vom ${weekRangeShort(week)} dran. Wenn ihr es löscht, sehen die Kinder es dort nicht mehr. Es ist sofort und für immer weg. Wirklich löschen?`
      : 'Dieses Foto löschen? Es ist sofort und für immer weg.'
    if (!window.confirm(question)) return false
    setDeletingId(photo.id)
    const ok = await remove(key, photo.id)
    setDeletingId(null)
    if (!ok) window.alert('Keine Verbindung zum Server. Bitte später noch einmal versuchen.')
    return ok
  }

  const moving = movingId ? photos?.find((p) => p.id === movingId) : undefined
  const recentPhotos = recent.flatMap((id) => {
    const photo = photos?.find((p) => p.id === id)
    return photo ? [photo] : []
  })
  const planOf = (photoId: string) => plan.find((e) => e.photo?.id === photoId)

  return (
    <>
      <p className="text-sm text-bark-700">
        Jede Woche ein Foto zum Freimachen. Der Plan zeigt, welches Foto wann dran ist; ihr könnt
        eins für eine Woche festlegen.
      </p>
      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-bark-700">
        Die Fotos werden auf diesem Gerät verkleinert, das Original bleibt bei euch. Gespeichert
        werden sie auf unserem Server in Deutschland. Abrufen kann sie nur, wer euren Familien-Link
        hat. Der Betreiber und der Hoster des Servers könnten sie technisch einsehen, ladet also nur
        Fotos hoch, bei denen euch das recht ist. Gelöschte Fotos sind sofort weg.
      </p>

      <div className="flex flex-col items-start gap-2">
        <label
          className={twMerge(
            'inline-flex min-h-14 cursor-pointer select-none items-center justify-center gap-2 rounded-full bg-sun px-7 py-3.5 text-lg font-extrabold text-bark-900 shadow-[0_4px_0_#c9962a] transition-transform active:scale-95 active:shadow-[0_1px_0_#c9962a] focus-within:ring-4 focus-within:ring-moss-600',
            uploading && 'pointer-events-none opacity-50',
          )}
        >
          {uploading ? 'Lädt hoch …' : '+ Fotos hochladen'}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={(e) => onFiles(e)}
            className="sr-only"
          />
        </label>
        {upload && <UploadStatus upload={upload} />}
      </div>

      {recentPhotos.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-extrabold">Gerade hochgeladen</h3>
            <button
              type="button"
              onClick={clearRecent}
              className="min-h-11 cursor-pointer select-none px-2 text-sm font-bold text-bark-600 underline"
            >
              Ausblenden
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {recentPhotos.map((photo) => {
              const entry = planOf(photo.id)
              return (
                <li key={photo.id} className="flex items-center gap-3">
                  <div className="w-24 shrink-0">
                    <PhotoThumb photo={photo} contain />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                    <p className="text-sm font-bold text-bark-800">
                      {entry ? weekLabel(entry.week) : 'Noch nicht eingeplant'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setMovingId(photo.id)}
                      className={secondaryButton}
                    >
                      Woche ändern
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-extrabold">Wochenplan</h3>
        {needsNew && (
          <p className="rounded-2xl bg-sun px-4 py-3 font-extrabold text-bark-900">
            Für nächste Woche fehlt ein Foto
          </p>
        )}
        {hasPhotos && !needsNew && coverage && <p className="font-bold">{coverage}</p>}
        {hasPhotos && missingWichtel > 0 && (
          <p className="text-sm font-bold text-bark-700">
            {missingWichtel === 1
              ? 'Noch 1 Wichtel-Foto fehlt'
              : `Noch ${missingWichtel} Wichtel-Fotos fehlen`}
          </p>
        )}
        {waiting > 0 && (
          <p className="text-sm text-bark-600">
            {waiting === 1 ? 'Ein weiteres Foto wartet' : `${waiting} weitere Fotos warten`} noch
            hinter dem Plan.
          </p>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-bark-100 overflow-hidden rounded-2xl bg-white">
        {main.map((entry) => (
          <WeekRow
            key={entry.week}
            entry={entry}
            currentWeek={currentWeek}
            disabled={uploading}
            upload={uploadWeek === entry.week ? upload : null}
            onFiles={onFiles}
            onMove={setMovingId}
          />
        ))}
      </ul>
      {later.length > 0 && (
        <>
          <h3 className="text-base font-extrabold">Später im Jahr</h3>
          <ul className="flex flex-col divide-y divide-bark-100 overflow-hidden rounded-2xl bg-white">
            {later.map((entry) => (
              <WeekRow
                key={entry.week}
                entry={entry}
                currentWeek={currentWeek}
                disabled={uploading}
                upload={uploadWeek === entry.week ? upload : null}
                onFiles={onFiles}
                onMove={setMovingId}
              />
            ))}
          </ul>
        </>
      )}

      {past.length > 0 && (
        <details className="rounded-2xl bg-white p-4">
          <summary className="min-h-11 cursor-pointer select-none font-extrabold">
            Schon gezeigte Fotos ({past.length})
          </summary>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {past.map(({ photo, week }) => (
              <li key={photo.id} className="flex flex-col gap-2">
                <PhotoThumb photo={photo} />
                <p className="px-1 text-sm text-bark-600">{weekLabel(week)}</p>
                <button
                  type="button"
                  disabled={deletingId === photo.id}
                  onClick={() => void onDelete(photo)}
                  className={secondaryButton}
                >
                  {deletingId === photo.id ? 'Löscht …' : 'Löschen'}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {moving && (
        <MovePhotoDialog
          key={moving.id}
          photo={moving}
          plan={plan}
          planned={
            photoPin(family, moving.id) !== null || photoOccasion(family, moving.id) !== null
          }
          deleting={deletingId === moving.id}
          onMove={(week) => {
            setPhotoWeek(moving.id, week)
            setMovingId(null)
          }}
          onReset={() => {
            setPhotoWeek(moving.id, null)
            setMovingId(null)
          }}
          onDelete={() => {
            void onDelete(moving).then((ok) => {
              if (ok) setMovingId(null)
            })
          }}
          onClose={() => setMovingId(null)}
        />
      )}
    </>
  )
}

/** "Fotos reichen bis KW 7": the last week of the unbroken row of planned photos from next week on. */
function coverageLabel(plan: WeekPlan[], currentWeek: string): string | null {
  let last: WeekPlan | undefined
  for (const entry of plan.slice(1)) {
    if (!entry.photo) break
    last = entry
  }
  if (!last) return null
  if (last === plan[plan.length - 1]) return 'Fotos reichen für mehr als ein Jahr'
  const year = weekYear(last.week) === weekYear(currentWeek) ? '' : ` (${weekYear(last.week)})`
  return `Fotos reichen bis KW ${weekNumber(last.week)}${year}`
}

function statusText(entry: WeekPlan): string {
  if (entry.source === 'shown') return entry.photo ? 'Läuft schon' : 'Foto wurde gelöscht'
  if (entry.source === 'pinned') return 'Fest eingeplant'
  if (entry.source === 'occasion') return 'Passendes Foto bereit'
  if (entry.source === 'regular' && entry.occasion)
    return `Normales Foto – kein eigenes ${shortOccasionName(entry.occasion)}-Foto`
  if (entry.source === 'regular') return ''
  return 'Noch kein Foto'
}

function WeekRow({
  entry,
  currentWeek,
  disabled,
  upload,
  onFiles,
  onMove,
}: {
  entry: WeekPlan
  currentWeek: string
  disabled: boolean
  /** Set while this row's photo is uploaded, or when that failed. */
  upload: Upload | null
  onFiles: (e: ChangeEvent<HTMLInputElement>, week: string) => void
  onMove: (photoId: string) => void
}) {
  const { week, photo, source, occasion, started } = entry
  const status = statusText(entry)
  const canUpload = !started && source !== 'pinned' && source !== 'occasion'
  // Only an empty week, or one that waits for an own photo, gets a prominent upload button.
  const wantsPhoto = canUpload && (source === null || Boolean(occasion))
  return (
    <li
      className={twMerge(
        'flex flex-col gap-2 px-4 py-3',
        occasion && 'border-l-[6px] border-l-sun bg-sun/20 pl-3',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-2xl font-extrabold leading-tight">KW {weekNumber(week)}</span>
          <span className="text-sm text-bark-600">
            {weekRangeShort(week)}
            {week === currentWeek && (
              <span className="font-bold text-bark-800"> · Diese Woche</span>
            )}
          </span>
          {occasion && <span className="mt-1 font-extrabold">{occasionName(occasion)}</span>}
          {status && <span className="text-sm font-bold text-bark-700">{status}</span>}
        </div>
        <div className="w-[88px] shrink-0 sm:w-28">
          {photo ? (
            <PhotoThumb photo={photo} contain />
          ) : (
            <div className="aspect-square rounded-xl border-2 border-dashed border-bark-300" />
          )}
        </div>
      </div>
      {(photo && !started) || canUpload ? (
        <div className="flex flex-wrap items-center gap-2">
          {photo && !started && (
            <button type="button" onClick={() => onMove(photo.id)} className={secondaryButton}>
              Verschieben
            </button>
          )}
          {canUpload && (
            <label
              className={twMerge(
                'inline-flex min-h-11 cursor-pointer select-none items-center justify-center text-sm font-extrabold transition-transform focus-within:ring-4 focus-within:ring-moss-600 active:scale-95',
                wantsPhoto
                  ? 'rounded-full bg-sun px-4 py-2 text-bark-900'
                  : 'rounded-full px-3 py-2 text-bark-600 underline',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              + Foto für diese Woche
              <input
                type="file"
                accept="image/*"
                disabled={disabled}
                onChange={(e) => onFiles(e, week)}
                className="sr-only"
              />
            </label>
          )}
        </div>
      ) : null}
      {upload && <UploadStatus upload={upload} />}
    </li>
  )
}

function UploadStatus({ upload }: { upload: Upload }) {
  const uploading = upload.done < upload.total
  const failed = !uploading && (upload.failed > 0 || upload.tooMany)
  return (
    <p
      role="status"
      className={twMerge(
        'rounded-2xl px-4 py-2 text-sm font-bold',
        failed ? 'bg-[#fbd9d4] text-[#8a2f25]' : 'bg-moss-100 text-moss-800',
      )}
    >
      <UploadSummary upload={upload} uploading={uploading} />
    </p>
  )
}

function UploadSummary({ upload, uploading }: { upload: Upload; uploading: boolean }) {
  if (uploading) {
    if (upload.current === 0) return <>{`${photoCount(upload.total)} ausgewählt`}</>
    const verb = upload.stage === 'resize' ? 'verkleinert' : 'hochgeladen'
    return <>{`Foto ${upload.current} von ${upload.total} wird ${verb} …`}</>
  }
  const ok = upload.total - upload.failed
  return (
    <>
      {ok > 0 && `${photoCount(ok)} hochgeladen. `}
      {upload.failed > 0 &&
        `${photoCount(upload.failed)} ${upload.failed === 1 ? 'hat' : 'haben'} nicht geklappt. Bitte noch einmal versuchen. `}
      {upload.tooMany &&
        `Mehr Fotos nimmt der Server nicht an (höchstens ${SERVER_LIMIT}). Löscht ein paar, dann passen neue hinein.`}
    </>
  )
}
