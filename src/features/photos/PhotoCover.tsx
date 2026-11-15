import { useId, type ReactNode } from 'react'
import type { Animal } from '@/features/family/schema'
import { AnimalItemArt } from './animal-items'

/**
 * What lies on the covered fields of the week's photo, drawn as one continuous layer: the
 * texture of the viewing child's animal (leaves, snow, clouds…) spans the whole photo and is only
 * cut out where fields are uncovered. Every covered field also carries one item of the animal,
 * the thing the animal takes away when it clears that field.
 */

/** Width of the drawing in SVG units; the height follows the photo's shape. */
const VIEW_W = 1000

type Rand = () => number

/** Small seeded random numbers, so the cover looks the same on every render and every phone. */
function mulberry32(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(...parts: (string | number)[]): number {
  let h = 2166136261
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

const pick = <T,>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)]!

/** A pointed leaf from -1 to 1 along x. */
const LEAF = 'M-1 0 C-0.5 -0.6 0.5 -0.6 1 0 C0.5 0.6 -0.5 0.6 -1 0 Z'

/** One spot of texture at (x, y); `c` is the size of a field. */
type Decor = (r: Rand, x: number, y: number, c: number) => ReactNode

type CoverStyle = {
  base: string
  /** Texture spots per field. */
  density: number
  decor: Decor
  /** Size of the item on each field, relative to the field. */
  hero: number
  /** A soft shadow under the item (not for things that float, like clouds). */
  heroShadow: boolean
  /** A light glow behind the item, where it would blend into the texture. */
  heroHalo?: string
}

function leaf(
  r: Rand,
  x: number,
  y: number,
  length: number,
  width: number,
  fill: string,
  rib?: string,
) {
  const rot = r() * 360
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={LEAF} transform={`scale(${length} ${length * width})`} fill={fill} />
      {rib && (
        <path
          d={`M${-length * 0.9} 0 L${length * 0.9} 0`}
          stroke={rib}
          strokeWidth={length * 0.07}
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

export const MAPLE =
  'M20 4 L23 12 L30 9 L28 17 L36 18 L29 23 L32 29 L23 27 L21 35 L19 35 L17 27 L8 29 L11 23 L4 18 L12 17 L10 9 L17 12 Z'

const COVER_STYLE: Record<Animal, CoverStyle> = {
  // Brown forest floor with dry leaves; a hazelnut on every field.
  squirrel: {
    base: '#a26b3b',
    density: 7,
    hero: 0.5,
    heroShadow: true,
    decor: (r, x, y, c) =>
      leaf(
        r,
        x,
        y,
        c * (0.13 + r() * 0.09),
        0.9,
        pick(r, ['#c8823f', '#b06a32', '#d39a55', '#8e5a2c', '#bf7a3a', '#9b8a45']),
        '#7a4a24',
      ),
  },
  // Bright autumn leaves in red, orange and yellow.
  hedgehog: {
    base: '#c4642f',
    heroHalo: '#ffe2a8',
    density: 5,
    hero: 0.55,
    heroShadow: true,
    decor: (r, x, y, c) => {
      const k = (c * (0.34 + r() * 0.14)) / 32
      const fill = pick(r, ['#e07a2e', '#d4512b', '#f0a93a', '#b8442a', '#e8b84a', '#cf6a2a'])
      return (
        <g transform={`translate(${x} ${y}) rotate(${r() * 360}) scale(${k}) translate(-20 -20)`}>
          <path d={MAPLE} fill={fill} />
          <path d="M20 12 L20 35" stroke="#8f3d1c" strokeOpacity="0.5" strokeWidth="1.6" />
        </g>
      )
    },
  },
  // Soft snow drifts with a few glints.
  fox: {
    base: '#e6eff7',
    density: 5,
    hero: 0.42,
    heroShadow: false,
    decor: (r, x, y, c) => {
      const rad = c * (0.2 + r() * 0.12)
      return (
        <g>
          <circle cx={x} cy={y + rad * 0.3} r={rad} fill="#d2e1ee" />
          <circle cx={x} cy={y} r={rad} fill="#f8fbff" />
          {r() < 0.35 && (
            <circle cx={x + rad * 0.4} cy={y - rad * 0.4} r={c * 0.025} fill="#ffffff" />
          )}
        </g>
      )
    },
  },
  // A night sky full of soft clouds, with a star here and there.
  owl: {
    base: '#3b3f74',
    density: 4,
    hero: 0.6,
    heroShadow: false,
    decor: (r, x, y, c) => {
      if (r() < 0.3) {
        return <circle cx={x} cy={y} r={c * (0.02 + r() * 0.015)} fill="#ffe7a3" />
      }
      const fill = pick(r, ['#464b86', '#4e5492', '#575d9c'])
      const rad = c * (0.16 + r() * 0.08)
      return (
        <g fill={fill}>
          <circle cx={x - rad * 0.9} cy={y + rad * 0.2} r={rad * 0.75} />
          <circle cx={x} cy={y - rad * 0.2} r={rad} />
          <circle cx={x + rad * 0.9} cy={y + rad * 0.25} r={rad * 0.7} />
        </g>
      )
    },
  },
  // A meadow: tufts of grass with little clover.
  rabbit: {
    base: '#68a142',
    heroHalo: '#d9f2a8',
    density: 10,
    hero: 0.5,
    heroShadow: true,
    decor: (r, x, y, c) => {
      const h = c * (0.18 + r() * 0.1)
      const color = pick(r, ['#4f8a32', '#7fba50', '#5c9a3a'])
      const clover = r() < 0.18
      return (
        <g>
          {[-1, 0, 1].map((i) => (
            <path
              key={i}
              d={`M${x + i * c * 0.03} ${y} Q${x + i * c * 0.06} ${y - h * 0.6} ${x + i * c * 0.1} ${y - h * (i === 0 ? 1 : 0.8)}`}
              fill="none"
              stroke={color}
              strokeWidth={c * 0.035}
              strokeLinecap="round"
            />
          ))}
          {clover &&
            [0, 120, 240].map((a) => (
              <circle
                key={a}
                cx={x + c * 0.1 + Math.cos((a * Math.PI) / 180) * c * 0.04}
                cy={y - c * 0.02 + Math.sin((a * Math.PI) / 180) * c * 0.04}
                r={c * 0.04}
                fill="#8ccb60"
              />
            ))}
        </g>
      )
    },
  },
  // Low blueberry bushes: leaves with berries peeking out.
  bear: {
    base: '#3b6631',
    heroHalo: '#b4dc92',
    density: 10,
    hero: 0.5,
    heroShadow: true,
    decor: (r, x, y, c) => {
      const berries = r() < 0.3
      return (
        <g>
          {leaf(
            r,
            x,
            y,
            c * (0.12 + r() * 0.07),
            0.8,
            pick(r, ['#5a9443', '#4b833a', '#6aa850', '#437a36']),
          )}
          {berries &&
            [
              [-0.05, 0],
              [0.05, 0.02],
              [0, -0.06],
            ].map(([dx, dy]) => (
              <g key={`${dx}-${dy}`}>
                <circle cx={x + dx! * c} cy={y + dy! * c} r={c * 0.05} fill="#45559f" />
                <circle
                  cx={x + dx! * c - c * 0.015}
                  cy={y + dy! * c - c * 0.015}
                  r={c * 0.012}
                  fill="#9aa7e0"
                />
              </g>
            ))}
        </g>
      )
    },
  },
  // Long, blue-green eucalyptus leaves with a twig now and then.
  koala: {
    base: '#759c89',
    heroHalo: '#e6f3ea',
    density: 8,
    hero: 0.55,
    heroShadow: true,
    decor: (r, x, y, c) => {
      const twig = r() < 0.12
      const rot = r() * 360
      return (
        <g>
          {twig && (
            <path
              d={`M${x} ${y} l${Math.cos(rot) * c * 0.35} ${Math.sin(rot) * c * 0.35}`}
              stroke="#8b7b63"
              strokeWidth={c * 0.03}
              strokeLinecap="round"
            />
          )}
          {leaf(
            r,
            x,
            y,
            c * (0.2 + r() * 0.1),
            0.38,
            pick(r, ['#8fbca3', '#a6cdb6', '#6e9a85', '#5f8a76']),
            '#557d69',
          )}
        </g>
      )
    },
  },
}

/** Where the item lies on a field: centre (0..1 within the field), turn and size. */
export function heroSpot(animal: Animal, cell: number) {
  const r = mulberry32(hash(animal, 'hero', cell))
  return {
    fx: 0.5 + (r() - 0.5) * 0.24,
    fy: 0.5 + (r() - 0.5) * 0.2,
    rot: (r() - 0.5) * 50,
    size: COVER_STYLE[animal].hero * (0.88 + r() * 0.2),
  }
}

/** The item of a field, drawn at its spot. */
function Hero({
  animal,
  cell,
  x,
  y,
  cw,
  ch,
  haloId,
}: {
  animal: Animal
  cell: number
  x: number
  y: number
  cw: number
  ch: number
  haloId: string
}) {
  const spot = heroSpot(animal, cell)
  const size = Math.min(cw, ch) * spot.size
  const cx = x + spot.fx * cw
  const cy = y + spot.fy * ch
  return (
    <g>
      {COVER_STYLE[animal].heroHalo && (
        <circle cx={cx} cy={cy} r={size * 0.62} fill={`url(#${haloId})`} />
      )}
      {COVER_STYLE[animal].heroShadow && (
        <ellipse
          cx={cx}
          cy={cy + size * 0.38}
          rx={size * 0.34}
          ry={size * 0.09}
          fill="#000"
          opacity="0.18"
        />
      )}
      <g
        transform={`translate(${cx} ${cy}) rotate(${spot.rot}) scale(${size / 40}) translate(-20 -20)`}
      >
        <AnimalItemArt animal={animal} />
      </g>
    </g>
  )
}

type Props = {
  animal: Animal
  cols: number
  rows: number
  /** Width / height of the photo. */
  aspect: number
  /** Field indexes (row by row) that are still covered. */
  covered: readonly number[]
  /** Draw the item on each field (off for the piece that is being cleared). */
  heroes?: boolean
  /** Shade the edges of uncovered fields (off for the piece that is being cleared). */
  edges?: boolean
  className?: string
}

export function PhotoCover({
  animal,
  cols,
  rows,
  aspect,
  covered,
  heroes = true,
  edges = true,
  className,
}: Props) {
  const clipId = `cover-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const style = COVER_STYLE[animal]
  const vw = VIEW_W
  const vh = VIEW_W / aspect
  const cw = vw / cols
  const ch = vh / rows
  const c = Math.min(cw, ch)
  const coveredSet = new Set(covered)

  const cellBox = (i: number) => ({ x: (i % cols) * cw, y: Math.floor(i / cols) * ch })

  // Only draw texture near the covered fields (matters for the small pieces being cleared).
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const i of covered) {
    const { x, y } = cellBox(i)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + cw)
    maxY = Math.max(maxY, y + ch)
  }

  // A jittered grid of texture spots. Each spot has its own seed, so the texture stays put
  // whichever fields are drawn.
  const step = c / Math.sqrt(style.density)
  const spots: ReactNode[] = []
  for (let gy = -1; gy * step < vh + step; gy++) {
    const y0 = gy * step
    if (y0 < minY - c * 0.6 || y0 > maxY + c * 0.6) continue
    for (let gx = -1; gx * step < vw + step; gx++) {
      const x0 = gx * step
      if (x0 < minX - c * 0.6 || x0 > maxX + c * 0.6) continue
      const r = mulberry32(hash(animal, gx, gy))
      const x = x0 + (r() - 0.5) * step
      const y = y0 + (r() - 0.5) * step
      spots.push(<g key={`${gx}-${gy}`}>{style.decor(r, x, y, c)}</g>)
    }
  }

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {style.heroHalo && (
          <radialGradient id={`${clipId}-halo`}>
            <stop offset="0" stopColor={style.heroHalo} stopOpacity="0.75" />
            <stop offset="0.6" stopColor={style.heroHalo} stopOpacity="0.35" />
            <stop offset="1" stopColor={style.heroHalo} stopOpacity="0" />
          </radialGradient>
        )}
        <clipPath id={clipId}>
          {/* One path for all fields: separate shapes would show hairline seams between them. */}
          <path
            d={covered
              .map((i) => {
                const { x, y } = cellBox(i)
                return `M${x} ${y}h${cw}v${ch}h${-cw}Z`
              })
              .join('')}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width={vw} height={vh} fill={style.base} />
        {spots}
        {/* A soft shadow along the edges of uncovered fields, so the cover has some depth. */}
        {edges &&
          Array.from({ length: cols * rows }, (_, i) => i)
            .filter((i) => !coveredSet.has(i))
            .map((i) => {
              const { x, y } = cellBox(i)
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={cw}
                  height={ch}
                  fill="none"
                  stroke="#000"
                  strokeOpacity="0.22"
                  strokeWidth={c * 0.08}
                />
              )
            })}
        {heroes &&
          covered.map((i) => {
            const { x, y } = cellBox(i)
            return (
              <Hero
                key={i}
                animal={animal}
                cell={i}
                x={x}
                y={y}
                cw={cw}
                ch={ch}
                haloId={`${clipId}-halo`}
              />
            )
          })}
      </g>
    </svg>
  )
}
