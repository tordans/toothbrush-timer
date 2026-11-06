import { useId } from 'react'
import type { Animal as AnimalId } from '@/features/family/schema'
import { Animal } from './Animal'
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
}

type Props = {
  days: DayStatus[]
  animal: AnimalId | null
  light: DayLight
  season: Season
  portrait: boolean
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

/** Catmull-Rom spline through the points, as an SVG path. */
function smoothPath(points: Pt[]): string {
  const first = points[0]
  if (!first) return ''
  let d = `M${first.x} ${first.y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`
  }
  return d
}

export function ForestWeek({ days, animal, light, season, portrait }: Props) {
  const id = useId().replace(/:/g, '')
  const L = portrait ? PORTRAIT : LANDSCAPE
  const path = smoothPath([L.pathStart, ...L.stations, L.pathEnd])
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
      role="img"
      aria-label="Die Woche im Wald"
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

      {/* the path */}
      <path d={path} fill="none" stroke="#c9a676" strokeWidth="64" strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        stroke="#dcc093"
        strokeWidth="44"
        strokeLinecap="round"
        strokeDasharray="2 26"
      />

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

      {days.map((day, i) => {
        const p = L.stations[i]
        if (!p) return null
        return <Station key={day.key} day={day} x={p.x} y={p.y} />
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
          <g className="animate-bob">
            <ellipse cx="50" cy="97" rx="26" ry="5" fill="#000" opacity="0.15" />
            <Animal animal={animal} />
          </g>
        </svg>
      )}
    </svg>
  )
}

function Station({ day, x, y }: { day: DayStatus; x: number; y: number }) {
  const both = day.morning && day.evening
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
      <ellipse cx={x} cy={y} rx="96" ry="34" fill={both ? '#c8e39a' : '#a8cc76'} />
      <MorningFlower x={x - 44} y={y + 8} open={day.morning} s={1.6} />
      <EveningLantern x={x + 22} y={y + 10} lit={day.evening} s={1.6} />
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
        <text
          x="0"
          y="1"
          textAnchor="middle"
          dominantBaseline="middle"
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
        <Cloud x={w * 0.2} y={sky(0.35)} />
        <Cloud x={w * 0.55} y={sky(0.2)} s={0.7} />
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
