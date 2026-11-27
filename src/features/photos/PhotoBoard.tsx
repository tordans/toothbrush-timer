import type { Animal } from '@/features/family/schema'
import { AnimalItem } from './animal-items'
import { PhotoCover } from './PhotoCover'
import { RevealAnimal } from './RevealAnimal'

export type Run = { id: number }

type Props = {
  url: string | null
  animal: Animal
  cols: number
  rows: number
  /** Width / height of the photo. */
  aspect: number
  /** Size of the board in px (the photo, contain-fitted into the free space). */
  width: number
  height: number
  covered: number[]
  /** Fields the child picked, in tap order. Null when the photo cannot be changed. */
  marked: number[] | null
  onToggle: (cell: number) => void
  run: Run | null
  /** Fields the animal started on in this run, in order. */
  started: number[]
  onClearStart: (cell: number) => void
  onCleared: (cell: number) => void
  onFinish: () => void
}

/** The photo of the week with its cover, the tap targets of the fields and the animal on top. */
export function PhotoBoard({
  url,
  animal,
  cols,
  rows,
  aspect,
  width,
  height,
  covered,
  marked,
  onToggle,
  run,
  started,
  onClearStart,
  onCleared,
  onFinish,
}: Props) {
  const coveredSet = new Set(covered)
  const markedSet = new Set(marked ?? [])
  return (
    <div className="relative" style={{ width, height }}>
      <div className="absolute inset-0 overflow-hidden rounded-2xl bg-moss-700 shadow-2xl ring-4 ring-cream/80">
        {url && (
          <img
            src={url}
            alt="Das Bild der Woche"
            draggable={false}
            className="absolute inset-0 h-full w-full select-none"
          />
        )}
        <PhotoCover
          animal={animal}
          cols={cols}
          rows={rows}
          aspect={aspect}
          covered={covered}
          className="absolute inset-0 h-full w-full"
        />
        {marked && (
          <div
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {Array.from({ length: cols * rows }, (_, i) =>
              coveredSet.has(i) ? (
                <button
                  key={i}
                  type="button"
                  aria-label={`Feld ${i + 1}`}
                  aria-pressed={markedSet.has(i)}
                  onClick={() => onToggle(i)}
                  className="relative touch-manipulation select-none rounded-lg outline-none focus-visible:bg-white/20 active:bg-white/25"
                >
                  {markedSet.has(i) && <Mark animal={animal} />}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        )}
      </div>
      {run && (
        <RevealAnimal
          key={run.id}
          animal={animal}
          cells={[...started, ...(marked ?? [])]}
          pending={marked ?? []}
          grid={{ width, height, cols, rows }}
          aspect={aspect}
          onClearStart={onClearStart}
          onCleared={onCleared}
          onFinish={onFinish}
        />
      )}
    </div>
  )
}

/** A picked field: a warm sun ring with the animal's item bobbing on it. */
function Mark({ animal }: { animal: Animal }) {
  return (
    <span className="pointer-events-none absolute inset-[5%] flex animate-pop items-center justify-center rounded-xl bg-sun/50 shadow-[0_0_14px_rgba(246,201,76,0.95)] ring-4 ring-sun">
      <AnimalItem animal={animal} className="h-2/3 w-2/3 animate-bob drop-shadow-md" />
    </span>
  )
}
