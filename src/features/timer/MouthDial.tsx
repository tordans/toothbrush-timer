import { SECTIONS } from './sections'

type Props = {
  /** 0–3 brushing, 4 done. */
  sectionIndex: number
  progress: number
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

// Upper jaw: left half on screen left (seen like in a mirror).
const QUADRANT_TEETH = {
  'top-left': teeth(185, 268, 5, 62, 50),
  'top-right': teeth(272, 355, 5, 62, 50),
  'bottom-right': teeth(5, 88, 5, 56, 44),
  'bottom-left': teeth(92, 175, 5, 56, 44),
} as const

const RING_R = 94
const RING = 2 * Math.PI * RING_R

/** Two minutes as a ring, the mouth inside with the current corner shining. */
export function MouthDial({ sectionIndex, progress }: Props) {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <circle cx="100" cy="100" r={RING_R} fill="#fffaf0" opacity="0.92" />
      <circle cx="100" cy="100" r={RING_R} fill="none" stroke="#e6d5bf" strokeWidth="8" />
      <circle
        cx="100"
        cy="100"
        r={RING_R}
        fill="none"
        stroke="#86ab52"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={RING}
        strokeDashoffset={RING * (1 - progress)}
        transform="rotate(-90 100 100)"
      />
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
        const active = i === sectionIndex
        const done = i < sectionIndex
        return (
          <g key={section.id}>
            {QUADRANT_TEETH[section.id].map((t, j) => (
              <rect
                key={j}
                x={t.x - 6.5}
                y={t.y - 8}
                width="13"
                height="16"
                rx="5"
                transform={`rotate(${t.angle} ${t.x} ${t.y})`}
                fill={active ? '#ffffff' : done ? '#fbf6ea' : '#efe6d4'}
                stroke={active ? '#f6c94c' : '#d9cbb2'}
                strokeWidth={active ? 2.5 : 1.2}
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
