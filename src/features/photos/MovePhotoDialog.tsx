import { useState } from 'react'
import { CloseIcon } from '@/components/icons'
import { Button, Card } from '@/components/ui'
import { weekLabel } from '@/lib/dates'
import type { Photo } from './api'
import { occasionName } from './occasions'
import { PhotoThumb } from './PhotoThumb'
import type { WeekPlan } from './rewards'

function optionLabel(entry: WeekPlan, photoId: string): string {
  const occasion = entry.occasion ? ` · ${occasionName(entry.occasion)}` : ''
  const taken =
    (entry.source === 'pinned' || entry.source === 'occasion') && entry.photo?.id !== photoId
  return `${weekLabel(entry.week)}${occasion}${taken ? ' (belegt)' : ''}`
}

/** Pins one photo to a week, puts it back into the normal order, or deletes it. */
export function MovePhotoDialog({
  photo,
  plan,
  planned,
  deleting,
  onMove,
  onReset,
  onDelete,
  onClose,
}: {
  photo: Photo
  /** The coming weeks; weeks that have started are not offered. */
  plan: WeekPlan[]
  /** The photo is pinned or kept for an occasion, so it can go back into the normal order. */
  planned: boolean
  deleting: boolean
  onMove: (week: string) => void
  onReset: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const options = plan.filter((entry) => !entry.started)
  const [week, setWeek] = useState(
    () => options.find((entry) => entry.photo?.id === photo.id)?.week ?? options[0]?.week ?? '',
  )
  const here = options.find((entry) => entry.photo?.id === photo.id)
  const unchanged = here?.source === 'pinned' && here.week === week

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-photo-title"
      className="fixed inset-0 z-30 flex overflow-y-auto bg-moss-950/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card className="m-auto flex w-full max-w-md animate-fadein flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="move-photo-title" className="text-xl font-extrabold">
            Foto verschieben
          </h2>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer select-none items-center justify-center rounded-full bg-moss-50 text-bark-700 transition active:scale-90"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="mx-auto w-full max-w-[16rem]">
          <PhotoThumb photo={photo} contain />
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold text-bark-700">
          Woche
          <select
            value={week}
            onChange={(e) => setWeek(e.currentTarget.value)}
            className="min-h-11 rounded-xl border-2 border-bark-100 bg-white px-2 text-base font-bold text-bark-900"
          >
            {options.map((entry) => (
              <option key={entry.week} value={entry.week}>
                {optionLabel(entry, photo.id)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={!week || unchanged}
            onClick={() => onMove(week)}
            className="min-h-11 cursor-pointer select-none"
          >
            Verschieben
          </Button>
          {planned && (
            <button
              type="button"
              onClick={onReset}
              className="min-h-11 cursor-pointer select-none rounded-full bg-bark-100 px-4 py-2 text-sm font-extrabold text-bark-800 transition-transform active:scale-95"
            >
              Zurück in die normale Reihenfolge
            </button>
          )}
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="min-h-11 cursor-pointer select-none rounded-full bg-bark-100 px-4 py-2 text-sm font-extrabold text-bark-800 transition-transform active:scale-95 disabled:opacity-50"
          >
            {deleting ? 'Löscht …' : 'Löschen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 cursor-pointer select-none px-3 font-bold text-bark-600 underline"
          >
            Abbrechen
          </button>
        </div>
      </Card>
    </div>
  )
}
