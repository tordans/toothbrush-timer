import type { Animal as AnimalId } from '@/features/family/schema'

export const ANIMAL_NAMES: Record<AnimalId, string> = {
  fox: 'Fuchs',
  hedgehog: 'Igel',
  owl: 'Eule',
  rabbit: 'Hase',
  squirrel: 'Eichhörnchen',
  bear: 'Bär',
  koala: 'Koala',
}

type Props = {
  animal: AnimalId
  /** Holds a toothbrush that moves (brushing screen). */
  brushing?: boolean
  className?: string
}

/** Our own forest animals, drawn in a 100×100 box, sitting and facing the viewer. */
export function Animal({ animal, brushing = false, className }: Props) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {ANIMAL_ART[animal]}
      <Eyes animal={animal} />
      {brushing && <Toothbrush />}
    </svg>
  )
}

const INK = '#2b2118'

function Eyes({ animal }: { animal: AnimalId }) {
  const y = EYE_Y[animal]
  const dx = animal === 'owl' ? 12 : 9
  if (animal === 'owl') {
    return (
      <g>
        {[-dx, dx].map((x) => (
          <g key={x}>
            <circle cx={50 + x} cy={y} r="9" fill="#fff8e6" />
            <circle cx={50 + x} cy={y} r="4.6" fill={INK} />
            <circle cx={51.6 + x} cy={y - 1.8} r="1.5" fill="#fff" />
          </g>
        ))}
      </g>
    )
  }
  return (
    <g>
      {[-dx, dx].map((x) => (
        <g key={x}>
          <ellipse cx={50 + x} cy={y} rx="3.1" ry="3.6" fill={INK} />
          <circle cx={51.1 + x} cy={y - 1.3} r="1.1" fill="#fff" />
        </g>
      ))}
      {/* rosy cheeks */}
      <ellipse cx={50 - dx - 4} cy={y + 7} rx="3.4" ry="2" fill="#f19c8f" opacity="0.55" />
      <ellipse cx={50 + dx + 4} cy={y + 7} rx="3.4" ry="2" fill="#f19c8f" opacity="0.55" />
    </g>
  )
}

const EYE_Y: Record<AnimalId, number> = {
  fox: 42,
  hedgehog: 50,
  owl: 36,
  rabbit: 46,
  squirrel: 42,
  bear: 40,
  koala: 39,
}

function Smile({ y, w = 4 }: { y: number; w?: number }) {
  return (
    <path
      d={`M${50 - w} ${y} Q50 ${y + w * 0.9} ${50 + w} ${y}`}
      fill="none"
      stroke={INK}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  )
}

function Toothbrush() {
  return (
    <g className="origin-[62px_60px] animate-brush">
      <rect x="60" y="56" width="30" height="5" rx="2.5" fill="#5aa9c9" />
      <rect x="56" y="54.5" width="7" height="8" rx="1.5" fill="#f4fbff" />
      {[57, 59, 61].map((x) => (
        <rect key={x} x={x} y="51" width="1.3" height="4" rx="0.6" fill="#f4fbff" />
      ))}
    </g>
  )
}

const ANIMAL_ART: Record<AnimalId, React.ReactNode> = {
  fox: (
    <g>
      <path d="M70 88 C95 86 98 62 84 52 C90 66 82 78 66 80 Z" fill="#e2762f" />
      <path d="M84 52 C90 60 89 68 86 72 C93 66 93 57 84 52 Z" fill="#fff6ea" />
      <ellipse cx="50" cy="76" rx="22" ry="18" fill="#e98a3e" />
      <ellipse cx="50" cy="80" rx="12" ry="12" fill="#fff6ea" />
      <path d="M26 22 L36 44 L22 44 Z" fill="#e2762f" />
      <path d="M74 22 L64 44 L78 44 Z" fill="#e2762f" />
      <path d="M28 28 L34 42 L25 42 Z" fill="#5b3523" />
      <path d="M72 28 L66 42 L75 42 Z" fill="#5b3523" />
      <path d="M22 44 C22 30 78 30 78 44 C78 58 62 64 50 64 C38 64 22 58 22 44 Z" fill="#e98a3e" />
      <path d="M24 46 C30 52 40 56 50 64 C38 64 26 58 24 46 Z" fill="#fff6ea" />
      <path d="M76 46 C70 52 60 56 50 64 C62 64 74 58 76 46 Z" fill="#fff6ea" />
      <ellipse cx="50" cy="55" rx="3.2" ry="2.4" fill="#2b2118" />
      <Smile y={58} w={3} />
      <ellipse cx="40" cy="92" rx="6" ry="3.5" fill="#5b3523" />
      <ellipse cx="60" cy="92" rx="6" ry="3.5" fill="#5b3523" />
    </g>
  ),
  hedgehog: (
    <g>
      <path
        d="M14 74 L10 62 L20 62 L14 48 L26 52 L24 36 L36 44 L40 28 L50 40 L58 26 L64 42 L76 32 L76 48 L88 44 L84 58 L94 60 L86 72 L92 80 L14 80 Z"
        fill="#7a5638"
      />
      <path
        d="M22 72 L20 62 L30 64 L30 52 L40 58 L46 44 L54 56 L62 44 L66 58 L76 52 L74 64 L84 66 L80 76 Z"
        fill="#94704c"
      />
      <ellipse cx="50" cy="74" rx="24" ry="18" fill="#e9cfa4" />
      <path d="M28 54 C28 40 72 40 72 54 C72 66 62 72 50 72 C38 72 28 66 28 54 Z" fill="#f1dcb6" />
      <circle cx="34" cy="42" r="5" fill="#e9cfa4" />
      <circle cx="66" cy="42" r="5" fill="#e9cfa4" />
      <ellipse cx="50" cy="60" rx="3.6" ry="2.8" fill="#2b2118" />
      <Smile y={64} w={3} />
      <ellipse cx="40" cy="92" rx="6" ry="3.5" fill="#a07a55" />
      <ellipse cx="60" cy="92" rx="6" ry="3.5" fill="#a07a55" />
    </g>
  ),
  owl: (
    <g>
      <path d="M24 20 L34 32 L22 34 Z" fill="#7d5a3c" />
      <path d="M76 20 L66 32 L78 34 Z" fill="#7d5a3c" />
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="#9a7048" />
      <path d="M22 60 C14 70 18 86 30 90 C26 80 26 70 22 60 Z" fill="#7d5a3c" />
      <path d="M78 60 C86 70 82 86 70 90 C74 80 74 70 78 60 Z" fill="#7d5a3c" />
      <ellipse cx="50" cy="72" rx="18" ry="20" fill="#e7cfa6" />
      {[64, 72, 80].map((y) =>
        [-8, 0, 8].map((x) => (
          <path
            key={`${x}-${y}`}
            d={`M${46 + x} ${y} Q${50 + x} ${y + 4} ${54 + x} ${y}`}
            fill="none"
            stroke="#b48d62"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        )),
      )}
      <path d="M26 36 C30 26 70 26 74 36 C74 46 64 50 50 50 C36 50 26 46 26 36 Z" fill="#b5875a" />
      <path d="M46 42 L54 42 L50 50 Z" fill="#f2a93b" />
      <ellipse cx="40" cy="95" rx="5" ry="3" fill="#f2a93b" />
      <ellipse cx="60" cy="95" rx="5" ry="3" fill="#f2a93b" />
    </g>
  ),
  rabbit: (
    <g>
      <ellipse cx="38" cy="22" rx="7" ry="20" fill="#cbbfb3" transform="rotate(-10 38 22)" />
      <ellipse cx="62" cy="22" rx="7" ry="20" fill="#cbbfb3" transform="rotate(10 62 22)" />
      <ellipse cx="38" cy="24" rx="3.4" ry="14" fill="#f1b9b0" transform="rotate(-10 38 24)" />
      <ellipse cx="62" cy="24" rx="3.4" ry="14" fill="#f1b9b0" transform="rotate(10 62 24)" />
      <ellipse cx="50" cy="78" rx="22" ry="17" fill="#d8cdc1" />
      <ellipse cx="50" cy="82" rx="12" ry="11" fill="#f6f0e8" />
      <circle cx="74" cy="86" r="7" fill="#f6f0e8" />
      <ellipse cx="50" cy="50" rx="24" ry="20" fill="#d8cdc1" />
      <ellipse cx="50" cy="58" rx="10" ry="7" fill="#f6f0e8" />
      <path d="M47 54 L53 54 L50 57 Z" fill="#e58b8b" />
      <Smile y={59} w={3} />
      <ellipse cx="40" cy="93" rx="7" ry="3.5" fill="#bfb2a5" />
      <ellipse cx="60" cy="93" rx="7" ry="3.5" fill="#bfb2a5" />
    </g>
  ),
  squirrel: (
    <g>
      <path d="M66 90 C96 88 100 50 86 30 C76 18 62 28 70 38 C80 50 82 66 66 74 Z" fill="#b5562b" />
      <path d="M74 40 C82 50 84 64 76 74 C88 66 90 50 80 38 Z" fill="#cf7240" />
      <ellipse cx="46" cy="76" rx="20" ry="17" fill="#c4633a" />
      <ellipse cx="46" cy="80" rx="11" ry="11" fill="#f5e3c8" />
      <path d="M28 26 L34 38 L26 38 Z" fill="#b5562b" />
      <path d="M64 26 L58 38 L66 38 Z" fill="#b5562b" />
      <path d="M26 28 L24 22 L30 26 Z" fill="#b5562b" />
      <path d="M66 28 L68 22 L62 26 Z" fill="#b5562b" />
      <ellipse cx="46" cy="46" rx="22" ry="18" fill="#c4633a" />
      <ellipse cx="46" cy="54" rx="11" ry="8" fill="#f5e3c8" />
      <ellipse cx="46" cy="51" rx="2.8" ry="2.2" fill="#2b2118" />
      <Smile y={55} w={2.8} />
      <ellipse cx="38" cy="92" rx="6" ry="3.5" fill="#8e4322" />
      <ellipse cx="56" cy="92" rx="6" ry="3.5" fill="#8e4322" />
    </g>
  ),
  bear: (
    <g>
      <circle cx="28" cy="24" r="9" fill="#8a5a3b" />
      <circle cx="72" cy="24" r="9" fill="#8a5a3b" />
      <circle cx="28" cy="24" r="4.5" fill="#c79772" />
      <circle cx="72" cy="24" r="4.5" fill="#c79772" />
      <ellipse cx="50" cy="76" rx="25" ry="19" fill="#8a5a3b" />
      <ellipse cx="50" cy="80" rx="14" ry="12" fill="#c79772" />
      <ellipse cx="50" cy="44" rx="26" ry="23" fill="#9a6644" />
      <ellipse cx="50" cy="54" rx="12" ry="9" fill="#e2bd98" />
      <ellipse cx="50" cy="50" rx="4" ry="3" fill="#2b2118" />
      <Smile y={55} w={3.4} />
      <ellipse cx="38" cy="93" rx="8" ry="4" fill="#6f462d" />
      <ellipse cx="62" cy="93" rx="8" ry="4" fill="#6f462d" />
    </g>
  ),
  koala: (
    <g>
      <circle cx="22" cy="30" r="13" fill="#9aa0a6" />
      <circle cx="78" cy="30" r="13" fill="#9aa0a6" />
      {/* fluffy ear tufts */}
      {[
        [12, 24],
        [15, 40],
        [18, 18],
        [88, 24],
        [85, 40],
        [82, 18],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#9aa0a6" />
      ))}
      <circle cx="22" cy="30" r="7.5" fill="#f3eee6" />
      <circle cx="78" cy="30" r="7.5" fill="#f3eee6" />
      <ellipse cx="50" cy="76" rx="25" ry="19" fill="#9aa0a6" />
      <ellipse cx="50" cy="80" rx="14" ry="12" fill="#f1ece3" />
      <ellipse cx="50" cy="45" rx="26" ry="22" fill="#b4b9be" />
      <ellipse cx="50" cy="59" rx="9" ry="5" fill="#dfe1e3" />
      <ellipse cx="50" cy="50" rx="5.5" ry="6.5" fill="#463b37" />
      <ellipse cx="48.4" cy="46.6" rx="1.6" ry="1.2" fill="#6b605b" />
      <Smile y={59} w={3} />
      <ellipse cx="38" cy="93" rx="8" ry="4" fill="#5f646a" />
      <ellipse cx="62" cy="93" rx="8" ry="4" fill="#5f646a" />
    </g>
  ),
}
