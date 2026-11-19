import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { twMerge } from 'tailwind-merge'
import { useFamily, useFamilyActions, useFamilyKey } from '@/features/family/family-store'
import { useNow } from '@/hooks/use-now'
import { dayMonthShort, fromIsoDay, weekKey } from '@/lib/dates'
import type { Photo } from './api'
import { OCCASIONS } from './occasions'
import { usePhotoActions, usePhotos, useUploadProgress } from './photo-store'
import { needsNewPhotos, photoOccasion, regularPhotos } from './rewards'
import { usePhotoUrl } from './use-photo-url'

/** The server keeps at most this many photos per family (see docs/central-storage.md). */
const SERVER_LIMIT = 300

function weeksLabel(n: number): string {
  return n === 1 ? 'Reicht noch für 1 Woche' : `Reicht noch für ${n} Wochen`
}

/** Parents' part of the reward photos: upload, how many are left, look at and delete them. */
export function PhotoManager() {
  const key = useFamilyKey()
  const now = useNow()
  const family = useFamily()
  const photos = usePhotos()
  const upload = useUploadProgress()
  const { add, remove, refresh } = usePhotoActions()
  const { setPhotoOccasion } = useFamilyActions()
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
  // Photos kept for an occasion wait for their week, so they do not count for normal weeks.
  const unused = regularPhotos(family, photos)
  const needsNew = needsNewPhotos(family, photos, currentWeek)
  const uploading = upload !== null && upload.done < upload.total

  // Photo id → the (latest) week that showed it.
  const weekOf = new Map<string, string>()
  for (const [week, w] of Object.entries(family.weekPhotos)) {
    const known = weekOf.get(w.photoId)
    if (!known || known < week) weekOf.set(w.photoId, week)
  }

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? [])
    // Reset, so choosing the same photos again still fires `change`.
    e.currentTarget.value = ''
    if (files.length > 0) void add(key, files)
  }

  const onDelete = async (photo: Photo) => {
    const week = weekOf.get(photo.id)
    const question = week
      ? `Dieses Foto war in der Woche vom ${dayMonthShort(fromIsoDay(week))} dran. Wenn ihr es löscht, sehen die Kinder es dort nicht mehr. Es ist sofort und für immer weg. Wirklich löschen?`
      : 'Dieses Foto löschen? Es ist sofort und für immer weg.'
    if (!window.confirm(question)) return
    setDeletingId(photo.id)
    const ok = await remove(key, photo.id)
    setDeletingId(null)
    if (!ok) window.alert('Keine Verbindung zum Server. Bitte später noch einmal versuchen.')
  }

  return (
    <>
      <p className="text-sm text-bark-700">
        Jede Woche ein Foto zum Freimachen: nach jedem Putzen darf euer Kind vier Felder aufdecken.
        Ladet so viele Fotos hoch, wie ihr mögt; jede Woche wird eins verbraucht.
      </p>
      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-bark-700">
        Die Fotos werden auf diesem Gerät verkleinert, das Original bleibt bei euch. Gespeichert
        werden sie auf unserem Server in Deutschland. Abrufen kann sie nur, wer euren Familien-Link
        hat. Der Betreiber und der Hoster des Servers könnten sie technisch einsehen, ladet also nur
        Fotos hoch, bei denen euch das recht ist. Gelöschte Fotos sind sofort weg.
      </p>

      <label
        className={twMerge(
          'inline-flex min-h-14 cursor-pointer select-none items-center justify-center gap-2 self-start rounded-full bg-sun px-7 py-3.5 text-lg font-extrabold text-bark-900 shadow-[0_4px_0_#c9962a] transition-transform active:scale-95 active:shadow-[0_1px_0_#c9962a] focus-within:ring-4 focus-within:ring-moss-600',
          uploading && 'pointer-events-none opacity-50',
        )}
      >
        {uploading ? 'Lädt hoch …' : '+ Fotos hochladen'}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={onFiles}
          className="sr-only"
        />
      </label>

      {upload && (
        <p
          role="status"
          className={twMerge(
            'rounded-2xl px-4 py-2 text-sm font-bold',
            !uploading && (upload.failed > 0 || upload.tooMany)
              ? 'bg-[#fbd9d4] text-[#8a2f25]'
              : 'bg-moss-100 text-moss-800',
          )}
        >
          <UploadSummary upload={upload} uploading={uploading} />
        </p>
      )}

      {photos !== null && photos.length > 0 && (
        <div className="flex flex-col gap-2">
          {unused.length > 0 && <p className="font-bold">{weeksLabel(unused.length)}</p>}
          {needsNew && (
            <p className="rounded-2xl bg-sun px-4 py-3 font-extrabold text-bark-900">
              Bitte neue Fotos hochladen – für nächste Woche ist keins mehr da.
            </p>
          )}
        </div>
      )}

      {photos !== null && photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => {
            const week = weekOf.get(photo.id)
            return (
              <li key={photo.id} className="flex flex-col gap-2 rounded-2xl bg-white p-2">
                <Thumb photo={photo} />
                {week ? (
                  <p className="px-1 text-sm text-bark-600">
                    Woche vom {dayMonthShort(fromIsoDay(week))}
                  </p>
                ) : (
                  <label className="flex flex-col gap-1 px-1 text-sm text-bark-600">
                    Für welche Woche?
                    <select
                      value={photoOccasion(family, photo.id) ?? ''}
                      onChange={(e) => setPhotoOccasion(photo.id, e.currentTarget.value || null)}
                      className="min-h-11 rounded-xl border-2 border-bark-100 bg-cream px-2 text-base font-bold text-bark-900"
                    >
                      <option value="">Nächste normale Woche</option>
                      {OCCASIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  disabled={deletingId === photo.id}
                  onClick={() => void onDelete(photo)}
                  className="min-h-11 cursor-pointer select-none rounded-full bg-bark-100 px-4 py-2 text-sm font-extrabold text-bark-800 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {deletingId === photo.id ? 'Löscht …' : 'Löschen'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function UploadSummary({
  upload,
  uploading,
}: {
  upload: NonNullable<ReturnType<typeof useUploadProgress>>
  uploading: boolean
}) {
  if (uploading) return <>{`${upload.done} von ${upload.total} hochgeladen …`}</>
  const ok = upload.total - upload.failed
  return (
    <>
      {ok > 0 && `${ok === 1 ? '1 Foto' : `${ok} Fotos`} hochgeladen. `}
      {upload.failed > 0 &&
        `${upload.failed === 1 ? '1 Foto' : `${upload.failed} Fotos`} ${
          upload.failed === 1 ? 'hat' : 'haben'
        } nicht geklappt (Verbindung oder Dateiformat). `}
      {upload.tooMany &&
        `Mehr Fotos nimmt der Server nicht an (höchstens ${SERVER_LIMIT}). Löscht ein paar, dann passen neue hinein.`}
    </>
  )
}

/**
 * A square thumbnail. The photo is only requested once the tile comes near the screen, because a
 * family may have hundreds of photos and each needs its own authorized request.
 */
function Thumb({ photo }: { photo: Photo }) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (near || !el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [near])
  const url = usePhotoUrl(near ? photo.id : undefined)

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-xl bg-moss-100 pb-[100%]"
      aria-hidden={url ? undefined : true}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-moss-600/40"
        >
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m4 18 5-5 4 4 3-3 4 4" />
        </svg>
      )}
    </div>
  )
}
