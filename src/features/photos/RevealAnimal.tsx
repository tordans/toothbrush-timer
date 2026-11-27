import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { Animal as AnimalId } from '@/features/family/schema'
import { Animal } from '@/features/forest/Animal'
import { AnimalItem, AnimalItemArt } from './animal-items'
import { heroSpot, MAPLE, PhotoCover } from './PhotoCover'
import {
  animalSize,
  besideCell,
  bitAt,
  bitSize,
  CLEAR,
  cellOf,
  fadeClear,
  lookTo,
  moverAt,
  travel,
  type Grid,
  type Play,
  type Point,
  type Stage,
} from './reveal-motion'

type Props = {
  animal: AnimalId
  /** All fields of this run: the ones being cleared or cleared already, then the picked ones. */
  cells: number[]
  /** The picked fields still waiting, in tap order. They may change while the animal runs. */
  pending: number[]
  grid: Grid
  /** Width / height of the photo. */
  aspect: number
  /** The field's clearing starts: from now on the piece here draws its cover. */
  onClearStart: (cell: number) => void
  /** The field is clear; store it now, so leaving half-way never loses a field. */
  onCleared: (cell: number) => void
  onFinish: () => void
}

/** Thrown to end the sequence when the page goes away mid-way. */
const STOPPED = new Error('stopped')

/**
 * The child's animal hops onto the photo, clears the picked fields one after another in its own
 * way (see reveal-motion.ts) and hops off again. A field the child unpicks on the way is skipped. Mount it with a new `key` for every run.
 */
export function RevealAnimal({
  animal,
  cells,
  pending,
  grid,
  aspect,
  onClearStart,
  onCleared,
  onFinish,
}: Props) {
  const mover = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const pieces = useRef(new Map<number, HTMLDivElement>())
  const bits = useRef<(HTMLDivElement | null)[]>([])
  const [stuckLeaves, setStuckLeaves] = useState(0)

  const s = animalSize(grid)
  const b = bitSize(grid)

  const latest = useEffectEvent(() => ({
    animal,
    pending,
    grid,
    onClearStart,
    onCleared,
    onFinish,
  }))

  useEffect(() => {
    let alive = true
    const running = new Set<Animation>()
    const play: Play = (el, keyframes, options) => {
      if (!alive) return Promise.reject(STOPPED)
      const anim = el.animate(keyframes, { fill: 'forwards', ...options })
      running.add(anim)
      return anim.finished.then(() => {
        running.delete(anim)
        // Keep the end state as inline style, so the next move starts from there.
        const last = keyframes[keyframes.length - 1]
        if (last?.transform !== undefined) el.style.transform = String(last.transform)
        if (last?.opacity !== undefined) el.style.opacity = String(last.opacity)
        anim.cancel()
        if (!alive) throw STOPPED
      })
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // The animal stays the same for the whole run.
    const { animal } = latest()

    const runAll = async () => {
      const m = mover.current
      const f = face.current
      const bd = body.current
      if (!m || !f || !bd) return
      const els = { mover: m, face: f, body: bd }
      let pos: Point | null = null

      // The child may still pick and unpick fields while the animal runs, so the next goal is
      // read fresh every time.
      for (;;) {
        const { grid: g, pending, onClearStart: start } = latest()
        const size = animalSize(g)
        const target = pending[0]

        if (target === undefined) {
          if (!pos) break
          if (reduced) break
          // Hop off, but come back when the child picks a field meanwhile.
          const out = { x: pos.x < g.width / 2 ? -size * 0.8 : g.width + size * 0.8, y: pos.y }
          pos = await travel(play, els, animal, pos, out, size, () => !latest().pending.length)
          if (latest().pending.length) continue
          break
        }

        const bit = bitSize(g)
        const cell = cellOf(g, target)
        const spot = besideCell(animal, cell, size)
        if (reduced) {
          m.style.transform = moverAt(spot, size)
          if (!pos) await play(m, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
          pos = spot
        } else {
          // Hop in from the nearer side edge of the photo.
          if (!pos) {
            pos = { x: spot.x < g.width / 2 ? -size * 0.7 : g.width + size * 0.7, y: spot.y }
            m.style.transform = moverAt(pos, size)
            m.style.opacity = '1'
          }
          // Turn round as soon as the child takes the goal back.
          pos = await travel(play, els, animal, pos, spot, size, () =>
            latest().pending.includes(target),
          )
        }
        if (latest().pending[0] !== target) continue
        lookTo(f, -cell.side)

        // Swap the field from the main cover to the piece in the same frame.
        const piece = pieces.current.get(target)
        const bitEls = bits.current.filter((el): el is HTMLDivElement => !!el)
        if (!piece || bitEls.length === 0) return
        piece.style.transformOrigin = `${cell.cx}px ${cell.cy}px`
        piece.style.transform = 'none'
        piece.style.opacity = '1'
        const hs = heroSpot(animal, target)
        const hero = {
          x: cell.x + hs.fx * cell.w,
          y: cell.y + hs.fy * cell.h,
          rot: hs.rot,
          scale: (Math.min(cell.w, cell.h) * hs.size) / bit,
        }
        // The field's item now flies on its own, above everything.
        const heroBit = bitEls[0]!
        heroBit.style.transform = bitAt(hero, bit, hero.scale, hero.rot)
        heroBit.style.opacity = '1'
        start(target)

        const stage: Stage = {
          play,
          ...els,
          piece,
          bits: bitEls,
          animal,
          cell,
          s: size,
          b: bit,
          pos,
          hero,
          addStuckLeaf: () => setStuckLeaves((n) => Math.min(n + 1, STUCK_SPOTS.length)),
        }
        if (reduced) await fadeClear(stage)
        else pos = await CLEAR[animal](stage)
        piece.style.opacity = '0'
        for (const el of bitEls) el.style.opacity = '0'
        latest().onCleared(target)
      }

      await play(m, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 })
      latest().onFinish()
    }

    runAll().catch((error: unknown) => {
      // Cancelled by leaving the page: nothing to do, finished fields are stored already.
      if (error !== STOPPED && !(error instanceof DOMException)) throw error
    })
    return () => {
      alive = false
      for (const anim of running) anim.cancel()
    }
    // Runs once per mount; the parent remounts with a new key for the next run.
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {cells.map((cell) => (
          <div
            key={cell}
            ref={(el) => {
              if (el) pieces.current.set(cell, el)
              else pieces.current.delete(cell)
            }}
            className="absolute inset-0"
            style={{ opacity: 0 }}
          >
            <PhotoCover
              animal={animal}
              cols={grid.cols}
              rows={grid.rows}
              aspect={aspect}
              covered={[cell]}
              heroes={false}
              edges={false}
              className="h-full w-full"
            />
          </div>
        ))}
      </div>
      <div
        ref={mover}
        className="absolute left-0 top-0 will-change-transform"
        style={{ width: s, height: s, opacity: 0 }}
      >
        <div ref={face} className="h-full w-full">
          <div ref={body} className="relative h-full w-full origin-bottom">
            <Animal animal={animal} className="h-full w-full drop-shadow-lg" />
            {animal === 'hedgehog' && stuckLeaves > 0 && <StuckLeaves count={stuckLeaves} />}
          </div>
        </div>
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            bits.current[i] = el
          }}
          className="absolute left-0 top-0"
          style={{ width: b, height: b, opacity: 0 }}
        >
          {i === 0 ? (
            <AnimalItem animal={animal} className="h-full w-full" />
          ) : (
            <svg viewBox="0 0 40 40" className="h-full w-full">
              {EXTRA_BIT[animal]}
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}

/** The small things that fly about while clearing, drawn in 40×40. */
const EXTRA_BIT: Record<AnimalId, React.ReactNode> = {
  // nut crumbs
  squirrel: (
    <g fill="#9a6230">
      <circle cx="16" cy="18" r="4" />
      <circle cx="25" cy="22" r="3" />
      <circle cx="19" cy="27" r="2.5" />
    </g>
  ),
  hedgehog: <AnimalItemArt animal="hedgehog" />,
  // a puff of snow
  fox: (
    <g>
      <circle cx="20" cy="22" r="13" fill="#dbe8f4" />
      <circle cx="18" cy="19" r="12" fill="#ffffff" />
    </g>
  ),
  // a gust of wind
  owl: (
    <path
      d="M4 16 C14 12 24 20 34 14 M8 26 C16 23 24 28 32 25"
      fill="none"
      stroke="#eef0ff"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.85"
    />
  ),
  // a tuft of grass
  rabbit: (
    <g fill="none" stroke="#5c9a3a" strokeWidth="3" strokeLinecap="round">
      <path d="M16 34 Q15 22 11 12" />
      <path d="M20 34 Q21 20 20 8" />
      <path d="M24 34 Q26 22 30 13" />
    </g>
  ),
  // one blueberry
  bear: (
    <g>
      <circle cx="20" cy="21" r="11" fill="#45559f" />
      <circle cx="16" cy="17" r="3" fill="#9aa7e0" />
      <path d="M17 11 L20 14 L23 11" fill="none" stroke="#2a3466" strokeWidth="1.6" />
    </g>
  ),
  koala: <AnimalItemArt animal="koala" />,
}

/** Where rolled-up leaves sit on the hedgehog's spines, in the 100×100 drawing. */
const STUCK_SPOTS = [
  [40, 34, -20, '#e07a2e'],
  [62, 36, 25, '#f0a93a'],
  [24, 52, -40, '#d4512b'],
  [78, 50, 40, '#e8b84a'],
  [50, 28, 5, '#cf6a2a'],
  [16, 66, -60, '#f0a93a'],
  [86, 64, 60, '#d4512b'],
  [70, 26, 15, '#e07a2e'],
] as const

function StuckLeaves({ count }: { count: number }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
      {STUCK_SPOTS.slice(0, count).map(([x, y, rot, fill]) => (
        <path
          key={`${x}-${y}`}
          d={MAPLE}
          fill={fill}
          transform={`translate(${x} ${y}) rotate(${rot}) scale(0.38) translate(-20 -20)`}
        />
      ))}
    </svg>
  )
}
