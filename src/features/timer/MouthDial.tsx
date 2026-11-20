import { SECTIONS } from './sections'

type Props = {
  /** 0–3 brushing (or next corner during a break), 4 done. */
  sectionIndex: number
  /** 0–1 inside the current corner. */
  sectionProgress: number
  /** Short break before `sectionIndex`. */
  switching: boolean
}

const CX = 100
const CY = 104

/** Teeth along an elliptic arc; angles in degrees, 0 = right, 90 = down. */
function teeth(from: number, to: number, count: number, rx: number, ry: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = ((from + ((to - from) * (i + 0.5)) / count) * Math.PI) / 180
    return { x: CX + rx * Math.cos(a), y: CY + ry * Math.sin(a), angle: (a * 180) / Math.PI + 90 }
  })
}

// Upper jaw: the animal's right half on screen left (its mouth faces the child).
const QUADRANT_TEETH = {
  'top-left': teeth(185, 268, 5, 62, 50),
  'top-right': teeth(272, 355, 5, 62, 50),
  'bottom-right': teeth(5, 88, 5, 56, 44),
  'bottom-left': teeth(92, 175, 5, 56, 44),
} as const

const RING_R = 94

/** Ring segment of one corner, in SVG degrees (0 = three o'clock, clockwise). */
const ARC: Record<(typeof SECTIONS)[number]['id'], [number, number]> = {
  'top-left': [180, 270],
  'top-right': [270, 360],
  'bottom-right': [0, 90],
  'bottom-left': [90, 180],
}

function arcPath(from: number, to: number) {
  const pad = 4 // small gap at the quarter marks
  const a = ((from + pad) * Math.PI) / 180
  const b = ((to - pad) * Math.PI) / 180
  const x1 = 100 + RING_R * Math.cos(a)
  const y1 = 100 + RING_R * Math.sin(a)
  const x2 = 100 + RING_R * Math.cos(b)
  const y2 = 100 + RING_R * Math.sin(b)
  return `M${x1} ${y1} A${RING_R} ${RING_R} 0 0 1 ${x2} ${y2}`
}

/**
 * The mouth inside a ring. The ring is split into the four corners; the segment of the corner
 * being brushed fills up, next to the shining teeth.
 */
export function MouthDial({ sectionIndex, sectionProgress, switching }: Props) {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <circle cx="100" cy="100" r={RING_R} fill="#fffaf0" opacity="0.92" />
      {SECTIONS.map((section, i) => {
        const [from, to] = ARC[section.id]
        const fill = i < sectionIndex ? 1 : i === sectionIndex && !switching ? sectionProgress : 0
        const d = arcPath(from, to)
        return (
          <g key={section.id}>
            <path d={d} fill="none" stroke="#e6d5bf" strokeWidth="9" strokeLinecap="round" />
            {fill > 0 && (
              <path
                d={d}
                pathLength={1}
                fill="none"
                stroke={i === sectionIndex ? '#f6c94c' : '#86ab52'}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="1 1"
                strokeDashoffset={1 - fill}
              />
            )}
          </g>
        )
      })}
      {/* quarter marks */}
      {[0, 90, 180, 270].map((a) => (
        <rect
          key={a}
          x="98.5"
          y="1"
          width="3"
          height="10"
          rx="1.5"
          fill="#a8764d"
          transform={`rotate(${a} 100 100)`}
        />
      ))}

      {/* gums */}
      <ellipse cx={CX} cy={CY} rx="72" ry="60" fill="#f5b3ad" />
      <ellipse cx={CX} cy={CY} rx="44" ry="34" fill="#c9575c" />
      <ellipse cx={CX} cy={CY + 8} rx="28" ry="14" fill="#e98b8b" />
      <line
        x1={CX}
        y1={CY - 64}
        x2={CX}
        y2={CY + 64}
        stroke="#fffaf0"
        strokeWidth="2"
        opacity="0.6"
      />

      {SECTIONS.map((section, i) => {
        const active = i === sectionIndex && !switching
        const next = i === sectionIndex && switching
        const done = i < sectionIndex
        return (
          <g key={section.id} className={next ? 'animate-blink' : undefined}>
            {QUADRANT_TEETH[section.id].map((t, j) => (
              <rect
                key={j}
                x={t.x - 6.5}
                y={t.y - 8}
                width="13"
                height="16"
                rx="5"
                transform={`rotate(${t.angle} ${t.x} ${t.y})`}
                fill={active || next ? '#ffffff' : done ? '#fbf6ea' : '#efe6d4'}
                stroke={active || next ? '#f6c94c' : '#d9cbb2'}
                strokeWidth={active || next ? 2.5 : 1.2}
              />
            ))}
            {done && <Sparkle {...sparkleSpot(section.jaw, section.side)} />}
          </g>
        )
      })}
    </svg>
  )
}

function sparkleSpot(jaw: 'top' | 'bottom', side: 'left' | 'right') {
  return { x: side === 'left' ? 40 : 160, y: jaw === 'top' ? 40 : 170 }
}

function Sparkle({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y - 9} L${x + 2.5} ${y - 2.5} L${x + 9} ${y} L${x + 2.5} ${y + 2.5} L${x} ${y + 9} L${x - 2.5} ${y + 2.5} L${x - 9} ${y} L${x - 2.5} ${y - 2.5} Z`}
      fill="#f6c94c"
    />
  )
}
