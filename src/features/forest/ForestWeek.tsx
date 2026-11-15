import { useEffect, useId, useState, type CSSProperties, type MouseEvent } from 'react'
import type { Animal as AnimalId } from '@/features/family/schema'
import { AnimalItem } from '@/features/photos/animal-items'
import { ForestThoughtBubble } from '@/features/photos/ThoughtBubble'
import { Animal } from './Animal'
import { useMeadowActions, useMeadowPlants } from './meadow-store'
import {
  Bush,
  EveningLantern,
  Fern,
  Grass,
  MorningFlower,
  Mushroom,
  PineTree,
  Rock,
  RoundTree,
  GROUND,
  SKY,
  type DayLight,
  type Season,
} from './scenery'

export type DayStatus = {
  key: string
  label: string
  dayOfMonth: number
  morning: boolean
  evening: boolean
  isToday: boolean
  isFuture: boolean
  isPast: boolean
  /** The brushing of this day still has fields to uncover on the reward photo. */
  photoFieldsLeft?: boolean
}

type Props = {
  days: DayStatus[]
  animal: AnimalId | null
  light: DayLight
  season: Season
  /** Width / height of the area the forest fills. */
  aspect: number
  /** Tapping the child's animal (to choose another one). */
  onAnimalTap?: () => void
  /** The animal looks forward to the reward photo: shows the thought bubble; tapping opens it. */
  onPhotoTap?: () => void
}

type Pt = { x: number; y: number }

type Layout = {
  w: number
  h: number
  horizon: number
  /** Top of the sky that is usually visible (landscape phones crop the top). */
  skyTop: number
  stations: Pt[]
  pathStart: Pt
  pathEnd: Pt
  back: { kind: 'pine' | 'round'; x: number; y: number; s: number; tone: 0 | 1 | 2 }[]
  /** Free places where a mushroom or flower may grow while the app is open. */
  grow: Pt[]
  front: {
    kind: 'bush' | 'mushroom' | 'rock' | 'fern' | 'grass'
    x: number
    y: number
    s?: number
  }[]
}

const LANDSCAPE: Layout = {
  w: 1600,
  h: 820,
  horizon: 430,
  skyTop: 250,
  grow: [
    { x: 258, y: 800 },
    { x: 474, y: 520 },
    { x: 690, y: 805 },
    { x: 906, y: 520 },
    { x: 1122, y: 805 },
    { x: 1338, y: 520 },
    { x: 1540, y: 805 },
    { x: 40, y: 560 },
    { x: 1580, y: 540 },
    { x: 905, y: 805 },
  ],
  stations: Array.from({ length: 7 }, (_, i) => ({
    x: 150 + i * 216,
    y: i % 2 === 0 ? 690 : 560,
  })),
  pathStart: { x: -40, y: 620 },
  pathEnd: { x: 1640, y: 640 },
  back: [
    { kind: 'pine', x: 60, y: 470, s: 1.15, tone: 1 },
    { kind: 'round', x: 230, y: 455, s: 1, tone: 0 },
    { kind: 'pine', x: 380, y: 440, s: 0.9, tone: 2 },
    { kind: 'round', x: 520, y: 450, s: 0.85, tone: 2 },
    { kind: 'pine', x: 700, y: 445, s: 1.05, tone: 0 },
    { kind: 'round', x: 860, y: 450, s: 1.1, tone: 1 },
    { kind: 'pine', x: 1010, y: 440, s: 0.95, tone: 1 },
    { kind: 'round', x: 1170, y: 452, s: 0.9, tone: 0 },
    { kind: 'pine', x: 1320, y: 445, s: 1.1, tone: 2 },
    { kind: 'round', x: 1480, y: 458, s: 1.05, tone: 2 },
    { kind: 'pine', x: 1580, y: 470, s: 1.2, tone: 0 },
  ],
  front: [
    { kind: 'rock', x: 40, y: 800 },
    { kind: 'fern', x: 120, y: 805 },
    { kind: 'mushroom', x: 300, y: 805 },
    { kind: 'grass', x: 470, y: 805 },
    { kind: 'bush', x: 560, y: 510 },
    { kind: 'mushroom', x: 760, y: 805, s: 1.2 },
    { kind: 'fern', x: 980, y: 805 },
    { kind: 'grass', x: 1090, y: 805 },
    { kind: 'bush', x: 1250, y: 805 },
    { kind: 'rock', x: 1420, y: 520, s: 0.8 },
    { kind: 'mushroom', x: 1560, y: 805 },
    { kind: 'grass', x: 260, y: 520 },
    { kind: 'grass', x: 900, y: 520 },
  ],
}

const PORTRAIT: Layout = {
  w: 900,
  h: 1500,
  horizon: 210,
  skyTop: 0,
  grow: [
    { x: 80, y: 410 },
    { x: 830, y: 560 },
    { x: 90, y: 690 },
    { x: 820, y: 780 },
    { x: 70, y: 960 },
    { x: 830, y: 1110 },
    { x: 90, y: 1230 },
    { x: 800, y: 1330 },
    { x: 840, y: 330 },
    { x: 60, y: 1420 },
  ],
  stations: Array.from({ length: 7 }, (_, i) => ({
    x: i % 2 === 0 ? 300 : 610,
    y: 330 + i * 178,
  })),
  pathStart: { x: 450, y: 220 },
  pathEnd: { x: 450, y: 1540 },
  back: [
    { kind: 'pine', x: 40, y: 250, s: 0.9, tone: 1 },
    { kind: 'round', x: 190, y: 240, s: 0.8, tone: 0 },
    { kind: 'pine', x: 330, y: 230, s: 0.75, tone: 2 },
    { kind: 'round', x: 470, y: 236, s: 0.7, tone: 2 },
    { kind: 'pine', x: 610, y: 232, s: 0.85, tone: 0 },
    { kind: 'round', x: 750, y: 240, s: 0.8, tone: 1 },
    { kind: 'pine', x: 870, y: 252, s: 0.95, tone: 2 },
  ],
  front: [
    { kind: 'bush', x: 820, y: 400 },
    { kind: 'mushroom', x: 90, y: 520 },
    { kind: 'fern', x: 830, y: 640 },
    { kind: 'rock', x: 80, y: 780, s: 0.9 },
    { kind: 'grass', x: 800, y: 860 },
    { kind: 'mushroom', x: 840, y: 1000, s: 1.2 },
    { kind: 'fern', x: 70, y: 1080 },
    { kind: 'bush', x: 820, y: 1220 },
    { kind: 'grass', x: 120, y: 1300 },
    { kind: 'rock', x: 830, y: 1430, s: 0.8 },
    { kind: 'mushroom', x: 110, y: 1460 },
  ],
}

/** Width / height below which the vertical (portrait) forest is used. */
const PORTRAIT_BELOW = 1.3

/**
 * Fits a base layout to the screen, so no day is cut off at the edges (iPad, Split View):
 * - landscape: narrower screens get a narrower forest, x positions are squeezed;
 * - portrait: wider screens get a shorter forest, y positions below the horizon are squeezed.
 * Very wide or very tall screens keep the base size and are cropped a little (sky, sides).
 */
function fitLayout(portrait: boolean, aspect: number): Layout {
  if (portrait) {
    const base = PORTRAIT
    const h = Math.min(base.h, Math.max(900, base.w / aspect))
    // Squeeze so the last day (with its sign below it) still fits above the bottom edge.
    const lastStation = base.stations[base.stations.length - 1]?.y ?? base.h
    const fy = Math.min(1, (h - 110 - base.horizon) / (lastStation - base.horizon))
    const y = (v: number) => (v <= base.horizon ? v : base.horizon + (v - base.horizon) * fy)
    const mapPt = <T extends Pt>(p: T): T => ({ ...p, y: y(p.y) })
    return {
      ...base,
      h,
      stations: base.stations.map(mapPt),
      grow: base.grow.map(mapPt),
      front: base.front.map(mapPt),
      pathStart: mapPt(base.pathStart),
      pathEnd: { ...base.pathEnd, y: h + 40 },
    }
  }
  const base = LANDSCAPE
  const w = Math.min(base.w, Math.max(1000, base.h * aspect))
  const fx = w / base.w
  const mapPt = <T extends Pt>(p: T): T => ({ ...p, x: p.x * fx })
  return {
    ...base,
    w,
    stations: base.stations.map(mapPt),
    grow: base.grow.map(mapPt),
    front: base.front.map(mapPt),
    back: base.back.map(mapPt),
    pathStart: mapPt(base.pathStart),
    pathEnd: { ...base.pathEnd, x: w + 40 },
  }
}

/** Catmull-Rom spline through the points, as one cubic Bézier segment per pair of points. */
function smoothSegments(points: Pt[]): string[] {
  const segments: string[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    segments.push(`C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`)
  }
  return segments
}

/** Mushrooms and flowers that grow, one every little while, while the forest is on screen. */
function useGrowingThings(spots: number, max = 8) {
  const [grown, setGrown] = useState<number[]>([])
  useEffect(() => {
    const id = setInterval(() => {
      setGrown((current) => {
        if (current.length >= Math.min(max, spots)) return current
        const free = Array.from({ length: spots }, (_, i) => i).filter((i) => !current.includes(i))
        const next = free[Math.floor(Math.random() * free.length)]
        return next === undefined ? current : [...current, next]
      })
    }, 25_000)
    return () => clearInterval(id)
  }, [spots, max])
  return grown
}

export function ForestWeek({
  days,
  animal,
  light,
  season,
  aspect,
  onAnimalTap,
  onPhotoTap,
}: Props) {
  const id = useId().replace(/:/g, '')
  const portrait = aspect < PORTRAIT_BELOW
  const L = fitLayout(portrait, aspect)
  const segments = smoothSegments([L.pathStart, ...L.stations, L.pathEnd])
  const path = `M${L.pathStart.x} ${L.pathStart.y} ${segments.join(' ')}`
  // The part of the path up to today is darker: there you have already been.
  const lastPast = days.reduce((last, d, i) => (d.isPast || d.isToday ? i : last), -1)
  const pastPath =
    lastPast >= 0
      ? `M${L.pathStart.x} ${L.pathStart.y} ${segments.slice(0, lastPast + 1).join(' ')}`
      : ''
  const grown = useGrowingThings(L.grow.length)
  const plants = useMeadowPlants(portrait ? 'portrait' : 'landscape')
  const { addPlant } = useMeadowActions()
  // Tapping the meadow grows a plant at the tapped point (in viewBox coordinates).
  // A tap anywhere on the ground (meadow, path, clearings, bushes) grows a plant there; not in the
  // sky and not on the animal, which has its own action.
  const onGroundTap = (e: MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-animal]')) return
    const svg = e.currentTarget
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(ctm.inverse())
    if (p.y < L.horizon + 30) return
    addPlant(portrait ? 'portrait' : 'landscape', p.x, p.y)
  }
  const dark = light === 'night' || light === 'evening'
  const ground = GROUND[season]
  const meadow = `M0 ${L.horizon + 30} Q${L.w * 0.5} ${L.horizon - 10} ${L.w} ${L.horizon + 30} V${L.h} H0 Z`
  const todayIndex = days.findIndex((d) => d.isToday)
  const todayStation = todayIndex >= 0 ? L.stations[todayIndex] : undefined

  return (
    <svg
      viewBox={`0 0 ${L.w} ${L.h}`}
      preserveAspectRatio={portrait ? 'xMidYMid slice' : 'xMidYMax slice'}
      className="h-full w-full"
      role="group"
      aria-label="Die Woche im Wald"
      onClick={onGroundTap}
    >
      <defs>
        {DAY_LIGHTS.map((l) => (
          <linearGradient key={l} id={`sky-${l}${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={SKY[l][0]} />
            <stop offset="1" stopColor={SKY[l][1]} />
          </linearGradient>
        ))}
        <linearGradient id={`ground-light${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={ground.light[0]} />
          <stop offset="1" stopColor={ground.light[1]} />
        </linearGradient>
        <linearGradient id={`ground-dark${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={ground.dark[0]} />
          <stop offset="1" stopColor={ground.dark[1]} />
        </linearGradient>
      </defs>

      {/* Sky: one layer per light, cross-faded, so switching morning/evening animates. */}
      {DAY_LIGHTS.map((l) => (
        <rect
          key={l}
          width={L.w}
          height={L.h}
          fill={`url(#sky-${l}${id})`}
          style={{ ...FADE, opacity: l === light ? 1 : 0 }}
        />
      ))}
      <SkyDecor light={light} w={L.w} top={L.skyTop} horizon={L.horizon} />

      {/* distant hills */}
      <path
        d={`M0 ${L.horizon} Q${L.w * 0.2} ${L.horizon - 90} ${L.w * 0.42} ${L.horizon - 20} T${L.w * 0.8} ${L.horizon - 40} T${L.w} ${L.horizon - 10} V${L.h} H0 Z`}
        style={{ fill: dark ? ground.hills[1] : ground.hills[0], transition: 'fill 1.4s ease' }}
        opacity="0.8"
      />
      {L.back.map((t, i) =>
        t.kind === 'pine' ? (
          <PineTree key={i} x={t.x} y={t.y} s={t.s} tone={t.tone} season={season} />
        ) : (
          <RoundTree key={i} x={t.x} y={t.y} s={t.s} tone={t.tone} season={season} />
        ),
      )}

      {/* meadow: light and dark layer, cross-faded */}
      <path d={meadow} fill={`url(#ground-light${id})`} />
      <path d={meadow} fill={`url(#ground-dark${id})`} style={{ ...FADE, opacity: dark ? 1 : 0 }} />

      {/* the path: light where the days are still to come, darker where they are behind */}
      <path d={path} fill="none" stroke="#c9a676" strokeWidth="64" strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        stroke="#dcc093"
        strokeWidth="44"
        strokeLinecap="round"
        strokeDasharray="2 26"
      />
      {pastPath && (
        <>
          <path d={pastPath} fill="none" stroke="#8a6a46" strokeWidth="64" strokeLinecap="round" />
          <path
            d={pastPath}
            fill="none"
            stroke="#a1825a"
            strokeWidth="44"
            strokeLinecap="round"
            strokeDasharray="2 26"
          />
        </>
      )}

      {L.front.map((f, i) => {
        switch (f.kind) {
          case 'bush':
            return <Bush key={i} x={f.x} y={f.y} s={f.s} season={season} />
          case 'mushroom':
            return <Mushroom key={i} x={f.x} y={f.y} s={f.s} />
          case 'rock':
            return <Rock key={i} x={f.x} y={f.y} s={f.s} />
          case 'fern':
            return <Fern key={i} x={f.x} y={f.y} s={f.s} />
          case 'grass':
            return <Grass key={i} x={f.x} y={f.y} s={f.s} />
        }
      })}

      {plants.map((plant) => (
        <g key={plant.id} className="animate-grow" style={GROW}>
          {plant.kind === 'grass' && <Grass x={plant.x} y={plant.y} s={1.3} />}
          {plant.kind === 'flower' && <MorningFlower x={plant.x} y={plant.y} open s={0.7} />}
          {plant.kind === 'mushroom' && <Mushroom x={plant.x} y={plant.y} s={1} />}
        </g>
      ))}

      {grown.map((spot, n) => {
        const p = L.grow[spot]
        if (!p) return null
        return (
          <g key={spot} className="animate-grow" style={GROW}>
            {n % 2 === 0 ? (
              <Mushroom x={p.x} y={p.y} s={1.1} />
            ) : (
              <MorningFlower x={p.x} y={p.y} open s={0.8} />
            )}
          </g>
        )
      })}

      {days.map((day, i) => {
        const p = L.stations[i]
        if (!p) return null
        return <Station key={day.key} day={day} animal={animal} x={p.x} y={p.y} />
      })}

      {todayStation && animal && (
        // The child's animal waits left of today's clearing.
        <svg
          x={todayStation.x - 250}
          y={todayStation.y - (portrait ? 150 : 170)}
          width="150"
          height="150"
          viewBox="0 0 100 100"
          overflow="visible"
        >
          <g
            className="animate-bob"
            data-animal
            role={onAnimalTap ? 'button' : undefined}
            tabIndex={onAnimalTap ? 0 : undefined}
            onKeyDown={(e) => {
              if (onAnimalTap && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onAnimalTap()
              }
            }}
            aria-label={onAnimalTap ? 'Anderes Tier aussuchen' : undefined}
            onClick={onAnimalTap}
            style={onAnimalTap ? { cursor: 'pointer' } : undefined}
          >
            {/* invisible tap area over the whole animal, so small fingers do not miss */}
            {onAnimalTap && <rect x="5" y="5" width="90" height="95" fill="transparent" />}
            <ellipse cx="50" cy="97" rx="26" ry="5" fill="#000" opacity="0.15" />
            <Animal animal={animal} />
          </g>
          {onPhotoTap && <ForestThoughtBubble animal={animal} onTap={onPhotoTap} />}
        </svg>
      )}
    </svg>
  )
}

function Station({
  day,
  animal,
  x,
  y,
}: {
  day: DayStatus
  animal: AnimalId | null
  x: number
  y: number
}) {
  const both = day.morning && day.evening
  const missed = day.isPast && !day.morning && !day.evening
  return (
    <g opacity={day.isFuture ? 0.6 : 1}>
      {day.isToday && (
        <ellipse
          cx={x}
          cy={y}
          rx="112"
          ry="40"
          fill="none"
          stroke="#fffbe8"
          strokeWidth="6"
          strokeDasharray="14 12"
          opacity="0.9"
        />
      )}
      <ellipse
        cx={x}
        cy={y}
        rx="96"
        ry="34"
        fill={missed ? '#6f7a48' : both ? '#c8e39a' : '#a8cc76'}
      />
      <MorningFlower x={x - 44} y={y + 8} open={day.morning} s={1.6} />
      <EveningLantern x={x + 22} y={y + 10} lit={day.evening} s={1.6} />
      {day.photoFieldsLeft && animal && (
        <AnimalItem animal={animal} x={x + 52} y={y - 16} width={32} height={32} />
      )}
      {/* wooden sign with the weekday */}
      <g transform={`translate(${x} ${y + 64})`}>
        <rect x="-4" y="-22" width="8" height="28" fill="#7a5638" />
        <rect
          x="-40"
          y="-28"
          width="80"
          height="40"
          rx="10"
          fill={day.isToday ? '#fff6dc' : '#e9d3ad'}
          stroke="#7a5638"
          strokeWidth="4"
        />
        {/* alphabetic baseline: "middle" sits too low with Nunito in some browsers */}
        <text
          x="0"
          y="0.5"
          textAnchor="middle"
          fontSize="24"
          fontWeight="800"
          fill="#4e352a"
          fontFamily="Nunito Variable, sans-serif"
        >
          {day.label} {day.dayOfMonth}
        </text>
      </g>
    </g>
  )
}

const FADE = { transition: 'opacity 1.4s ease' } as const
const GROW = { transformBox: 'fill-box', transformOrigin: '50% 100%' } as const

/** Cloud drift across the whole width; a negative delay starts each cloud somewhere on its way. */
function driftStyle(w: number, seconds: number, startAt: number) {
  return {
    '--drift': `${w + 400}px`,
    animationDuration: `${seconds}s`,
    animationDelay: `${-seconds * startAt}s`,
  } as CSSProperties
}
const DAY_LIGHTS: DayLight[] = ['morning', 'day', 'evening', 'night']
const MOVE = { transition: 'transform 1.6s ease, opacity 1.4s ease' } as const

/** Sun, moon, stars and clouds are always drawn and move or fade when the light changes. */
function SkyDecor({
  light,
  w,
  top,
  horizon,
}: {
  light: DayLight
  w: number
  top: number
  horizon: number
}) {
  // Positions inside the visible sky; "below the horizon" hides behind the hills.
  const sky = (f: number) => top + (horizon - top) * f
  const sunY = {
    morning: sky(0.45),
    day: sky(0.3),
    evening: sky(0.85),
    night: horizon + 160,
  }[light]
  const moonY = light === 'night' ? sky(0.4) : horizon + 160
  const starOpacity = { morning: 0, day: 0, evening: 0.35, night: 0.85 }[light]
  const cloudOpacity = { morning: 0.85, day: 0.9, evening: 0.45, night: 0 }[light]
  return (
    <g>
      <g style={{ ...FADE, opacity: starOpacity }}>
        {Array.from({ length: 24 }, (_, i) => (
          <circle
            key={i}
            cx={(i * 397) % w}
            cy={top + 10 + ((i * 131) % Math.max(horizon - top - 70, 40))}
            r={i % 3 === 0 ? 2.6 : 1.6}
            fill="#fff8d6"
          />
        ))}
      </g>
      <g style={{ ...MOVE, transform: `translate(${w * 0.8}px, ${sunY}px)` }}>
        <circle r="70" fill="#fff3c4" opacity="0.5" />
        <circle
          r="42"
          style={{
            fill: light === 'evening' ? '#f7a96b' : '#ffe08a',
            transition: 'fill 1.4s ease',
          }}
        />
      </g>
      <g style={{ ...MOVE, transform: `translate(${w * 0.82}px, ${moonY}px)` }}>
        <circle r="34" fill="#f4f1d8" />
        <circle cx="14" cy="-8" r="30" fill="#1f2347" />
      </g>
      <g style={{ ...FADE, opacity: cloudOpacity }}>
        {/* two clouds drift slowly across the sky */}
        <g className="drift" style={driftStyle(w, 95, 0.3)}>
          <Cloud x={-200} y={sky(0.35)} />
        </g>
        <g className="drift" style={driftStyle(w, 140, 0.75)}>
          <Cloud x={-200} y={sky(0.2)} s={0.7} />
        </g>
      </g>
    </g>
  )
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff" opacity="0.85">
      <ellipse cx="0" cy="0" rx="60" ry="22" />
      <circle cx="-22" cy="-12" r="22" />
      <circle cx="12" cy="-20" r="28" />
    </g>
  )
}
