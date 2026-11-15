import { twMerge } from 'tailwind-merge'
import { photoGrid, type WeekPhotoInfo } from './rewards'
import { usePhotoUrl } from './use-photo-url'

/** The photo fits into this box, whatever its shape; the calendar column is a little wider. */
const BOX = 38

/** Cover colour of a field that is not uncovered yet: plain, so the thumbnail stays calm. */
const COVER = '#c9bfa8'

/**
 * A small thumbnail of a week's reward photo as it is: uncovered fields show the photo, the others
 * a plain cover. The whole button is at least 44 px wide and high; tapping opens the photo view.
 */
export function WeekThumb({
  info,
  label,
  onOpen,
  className,
}: {
  info: WeekPhotoInfo
  label: string
  onOpen: () => void
  className?: string
}) {
  const url = usePhotoUrl(info.photo.id)
  const { cols, rows } = photoGrid(info.photo)
  const { width, height } = info.photo
  const wide = width >= height
  const boxW = Math.round(wide ? BOX : (BOX * width) / height)
  const boxH = Math.round(wide ? (BOX * height) / width : BOX)
  const cells = Array.from({ length: cols * rows }, (_, i) => i)
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onOpen}
      className={twMerge(
        'flex min-h-11 min-w-11 cursor-pointer touch-manipulation select-none items-center justify-center rounded-xl transition active:scale-90',
        className,
      )}
    >
      <span
        className="relative block overflow-hidden rounded-md bg-moss-200 shadow ring-1 ring-bark-300"
        style={{
          width: boxW,
          height: boxH,
          backgroundImage: url ? `url(${url})` : undefined,
          backgroundSize: '100% 100%',
        }}
      >
        <span
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {cells.map((i) => (
            <span key={i} style={info.revealed.has(i) ? undefined : { background: COVER }} />
          ))}
        </span>
      </span>
    </button>
  )
}
