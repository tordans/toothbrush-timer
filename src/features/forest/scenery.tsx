import type { Slot } from '@/features/family/schema'

/** Small forest pieces, each drawn around its own foot point (x, y) and scaled with `s`. */

type At = { x: number; y: number; s?: number }

const place = ({ x, y, s = 1 }: At) => `translate(${x} ${y}) scale(${s})`

/** The forest follows the seasons: blossoms, summer green, autumn leaves, snow. */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

export function seasonFor(date: Date): Season {
  // Dev only: localStorage 'brush-season' = 'winter' etc. to look at other seasons.
  const override = import.meta.env.DEV ? localStorage.getItem('brush-season') : null
  if (override && (SEASONS as string[]).includes(override)) return override as Season
  const m = date.getMonth() + 1
  if (m === 12 || m <= 2) return 'winter'
  if (m <= 5) return 'spring'
  if (m <= 8) return 'summer'
  return 'autumn'
}

export const GROUND: Record<
  Season,
  { light: [string, string]; dark: [string, string]; hills: [string, string] }
> = {
  spring: {
    light: ['#9cc463', '#78a447'],
    dark: ['#5c7d3a', '#3f5a28'],
    hills: ['#b5d395', '#4c6a52'],
  },
  summer: {
    light: ['#8fb85a', '#6e9a42'],
    dark: ['#5c7d3a', '#3f5a28'],
    hills: ['#a9c98a', '#4c6a52'],
  },
  autumn: {
    light: ['#a3b45a', '#86964a'],
    dark: ['#66703a', '#4a5228'],
    hills: ['#c4c48a', '#5a6248'],
  },
  winter: {
    light: ['#eef3f6', '#d3e0e8'],
    dark: ['#b9c6d6', '#8e9bb4'],
    hills: ['#f6f9fb', '#9aa7c0'],
  },
}

export function PineTree(p: At & { tone?: 0 | 1 | 2; season: Season }) {
  const greens = ['#3f6b3a', '#355d33', '#2c4f2c'] as const
  const g = greens[p.tone ?? 0]
  return (
    <g transform={place(p)}>
      <rect x="-7" y="-26" width="14" height="28" rx="3" fill="#6b4a33" />
      <path
        d="M0 -190 L-46 -110 L-30 -110 L-62 -50 L-40 -50 L-74 12 L74 12 L40 -50 L62 -50 L30 -110 L46 -110 Z"
        fill={g}
        transform="translate(0 -24)"
      />
      <path
        d="M0 -190 L-20 -150 L4 -140 Z"
        fill="#ffffff"
        opacity="0.08"
        transform="translate(0 -24)"
      />
      {p.season === 'winter' && (
        <path
          d="M0 -214 L-30 -162 L-15 -168 L0 -158 L15 -168 L30 -162 Z M-46 -134 L-22 -138 L-36 -124 Z M46 -134 L22 -138 L36 -124 Z M-62 -74 L-36 -78 L-50 -64 Z M62 -74 L36 -78 L50 -64 Z"
          fill="#ffffff"
        />
      )}
    </g>
  )
}

const CROWNS: Record<Exclude<Season, 'winter'>, [string, string][]> = {
  spring: [
    ['#9cc760', '#7ea64a'],
    ['#a8d06c', '#8bb35a'],
    ['#9cc760', '#7ea64a'],
  ],
  summer: [
    ['#7ea64a', '#6a8f3b'],
    ['#94b35a', '#7ea64a'],
    ['#6a8f3b', '#52722c'],
  ],
  autumn: [
    ['#e0a43c', '#c9852c'],
    ['#d9673a', '#b8502c'],
    ['#c9b23f', '#a8922f'],
  ],
}

export function RoundTree(p: At & { tone?: 0 | 1 | 2; season: Season }) {
  const trunk = (
    <>
      <path d="M-8 0 L-6 -70 L6 -70 L8 0 Z" fill="#7a5638" />
      <path
        d="M-4 -58 L-26 -86 M4 -64 L22 -92"
        stroke="#7a5638"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </>
  )
  if (p.season === 'winter') {
    // bare branches with a little snow
    return (
      <g transform={place(p)}>
        {trunk}
        <path
          d="M0 -70 L0 -150 M0 -110 L-38 -140 M0 -124 L34 -156 M-26 -86 L-56 -110 M22 -92 L52 -116 M-38 -140 L-46 -164 M34 -156 L40 -178"
          stroke="#7a5638"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M-6 -150 Q0 -158 6 -150 M-44 -142 Q-38 -148 -32 -140 M28 -158 Q34 -164 40 -156"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    )
  }
  const [light, dark] = CROWNS[p.season][p.tone ?? 0] ?? ['#7ea64a', '#6a8f3b']
  return (
    <g transform={place(p)}>
      {trunk}
      <circle cx="0" cy="-118" r="54" fill={dark} />
      <circle cx="-34" cy="-96" r="36" fill={dark} />
      <circle cx="34" cy="-92" r="38" fill={dark} />
      <circle cx="-12" cy="-132" r="40" fill={light} />
      <circle cx="26" cy="-118" r="30" fill={light} />
      {p.season === 'spring' &&
        [
          [-30, -130],
          [6, -150],
          [30, -110],
          [-10, -100],
          [-44, -98],
          [40, -136],
        ].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="6" fill="#f7c6d4" />)}
    </g>
  )
}

export function Bush(p: At & { season: Season }) {
  const winter = p.season === 'winter'
  return (
    <g transform={place(p)}>
      <ellipse cx="0" cy="-18" rx="44" ry="26" fill={winter ? '#4f7a46' : '#5f8a3a'} />
      <ellipse cx="-24" cy="-26" rx="24" ry="20" fill={winter ? '#ffffff' : '#74a046'} />
      <ellipse cx="18" cy="-30" rx="26" ry="22" fill={winter ? '#ffffff' : '#74a046'} />
      <circle cx="-14" cy="-30" r="3.5" fill="#e3584b" />
      <circle cx="10" cy="-38" r="3.5" fill="#e3584b" />
      <circle cx="26" cy="-22" r="3.5" fill="#e3584b" />
    </g>
  )
}

export function Mushroom(p: At) {
  return (
    <g transform={place(p)}>
      <path d="M-6 0 Q-7 -14 -4 -20 L4 -20 Q7 -14 6 0 Z" fill="#f4ead8" />
      <path d="M-20 -18 Q0 -46 20 -18 Z" fill="#d9493d" />
      <circle cx="-8" cy="-26" r="3" fill="#fff6ea" />
      <circle cx="6" cy="-30" r="2.5" fill="#fff6ea" />
      <circle cx="10" cy="-22" r="2" fill="#fff6ea" />
    </g>
  )
}

export function Rock(p: At) {
  return (
    <g transform={place(p)}>
      <path d="M-40 0 C-42 -24 -20 -40 4 -38 C26 -36 42 -20 40 0 Z" fill="#9aa1a0" />
      <path
        d="M-26 -20 C-16 -32 0 -34 12 -30"
        stroke="#b8bebd"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

export function Fern(p: At) {
  return (
    <g transform={place(p)} stroke="#5a8a3c" strokeWidth="5" strokeLinecap="round" fill="none">
      <path d="M0 0 Q-10 -30 -30 -46" />
      <path d="M0 0 Q4 -34 -2 -60" />
      <path d="M0 0 Q14 -26 34 -40" />
    </g>
  )
}

export function Grass(p: At) {
  return (
    <g transform={place(p)} stroke="#6f9a45" strokeWidth="3" strokeLinecap="round" fill="none">
      <path d="M-8 0 L-12 -14" />
      <path d="M0 0 L0 -18" />
      <path d="M8 0 L12 -13" />
    </g>
  )
}

/** Morning: a closed bud that opens into a sun-coloured flower once brushed. */
export function MorningFlower({ open, ...p }: At & { open: boolean }) {
  return (
    <g transform={place(p)}>
      <path d="M0 0 L0 -46" stroke="#5a8a3c" strokeWidth="5" strokeLinecap="round" />
      <path d="M0 -18 Q-16 -22 -20 -34 Q-6 -32 0 -22" fill="#6f9a45" />
      {open ? (
        <g transform="translate(0 -56)">
          <circle r="30" fill="#ffe28a" opacity="0.35" className="animate-glow" />
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-14"
              rx="7"
              ry="12"
              fill="#f6c94c"
              transform={`rotate(${i * 45})`}
            />
          ))}
          <circle r="8" fill="#c9792e" />
        </g>
      ) : (
        <g transform="translate(0 -52)">
          <path d="M0 -14 C-9 -8 -9 4 0 6 C9 4 9 -8 0 -14 Z" fill="#8bb35a" />
          <path d="M0 -14 C-3 -6 -3 2 0 6" stroke="#6f9a45" strokeWidth="1.5" fill="none" />
        </g>
      )}
    </g>
  )
}

/** Evening: a little lantern that lights up once brushed. */
export function EveningLantern({ lit, ...p }: At & { lit: boolean }) {
  return (
    <g transform={place(p)}>
      <path d="M0 0 L0 -34" stroke="#6b4a33" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M0 -34 Q14 -40 14 -50"
        stroke="#6b4a33"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <g transform="translate(14 -50)">
        {lit && <circle cy="18" r="30" fill="#ffd27a" opacity="0.35" className="animate-glow" />}
        <path d="M-2 0 L2 0 L2 6 L-2 6 Z" fill="#4e352a" />
        <path
          d="M-10 6 L10 6 L12 28 L-12 28 Z"
          fill={lit ? '#ffcf6b' : '#c8c2b4'}
          stroke="#4e352a"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M-13 28 L13 28 L11 33 L-11 33 Z" fill="#4e352a" />
        {lit && <ellipse cy="18" rx="4" ry="6" fill="#fff4cf" />}
      </g>
    </g>
  )
}

/** Sky and light by time of day, so the forest feels like "now". */
export type DayLight = 'morning' | 'day' | 'evening' | 'night'

function dayLightFor(date: Date): DayLight {
  const h = date.getHours()
  if (h < 6 || h >= 21) return 'night'
  if (h < 10) return 'morning'
  if (h < 17) return 'day'
  return 'evening'
}

/**
 * The light follows the morning/evening switch. When the switch matches the clock, the real time
 * of day is shown (e.g. night at 21:00); otherwise a typical morning or evening sky.
 */
export function dayLightForSlot(slot: Slot, date: Date): DayLight {
  const real = dayLightFor(date)
  if (slot === 'morning') return real === 'morning' || real === 'day' ? real : 'morning'
  return real === 'night' ? 'night' : 'evening'
}

export const SKY: Record<DayLight, [string, string]> = {
  morning: ['#bfe3f2', '#fde6c8'],
  day: ['#a9daf0', '#e3f3f7'],
  evening: ['#6a6aa8', '#f3b88e'],
  night: ['#1f2347', '#3b3f74'],
}
