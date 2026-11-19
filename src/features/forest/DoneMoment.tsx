import type { CSSProperties } from 'react'
import type { Animal as AnimalId } from '@/features/family/schema'
import { ThoughtBubble } from '@/features/photos/ThoughtBubble'
import { Animal } from './Animal'
import { EveningLantern, Grass, MorningFlower } from './scenery'

/**
 * How each animal celebrates once at the end of brushing (see docs/animals.md). `cheer` is the
 * whole-body move, `seconds` its length, `lightAt` the moment (from the start) when today's
 * flower or lantern lights up, timed to the animal's high point.
 */
const CHEER: Record<
  AnimalId,
  { cheer: string; origin: string; seconds: number; lightAt: number; extras?: React.ReactNode }
> = {
  // Tiptoe, tiptoe, crouch, pounce.
  fox: { cheer: 'animate-cheer-fox', origin: 'origin-bottom', seconds: 1.6, lightAt: 1.6 },
  // Curls into a ball, rolls out and back, uncurls.
  hedgehog: {
    cheer: 'animate-cheer-hedgehog',
    origin: 'origin-center',
    seconds: 1.8,
    lightAt: 2.1,
  },
  // Lifts off and hovers with wide, slow wing beats.
  owl: {
    cheer: 'animate-cheer-owl',
    origin: 'origin-bottom',
    seconds: 2.2,
    lightAt: 1.6,
    extras: <OwlWings />,
  },
  // A double skip, long then short.
  rabbit: { cheer: 'animate-cheer-rabbit', origin: 'origin-bottom', seconds: 1.5, lightAt: 1.6 },
  // A quick hop with a full spin and a tail flick.
  squirrel: {
    cheer: 'animate-cheer-squirrel',
    origin: 'origin-bottom',
    seconds: 1.2,
    lightAt: 1.4,
  },
  // A slow happy sway, rubbing its tummy.
  bear: {
    cheer: 'animate-cheer-bear',
    origin: 'origin-bottom',
    seconds: 2.6,
    lightAt: 1.6,
    extras: <BearPaw />,
  },
  // A slow, wide sway with closed happy eyes.
  koala: {
    cheer: 'animate-cheer-koala',
    origin: 'origin-bottom',
    seconds: 3,
    lightAt: 1.8,
    extras: <KoalaHappyEyes />,
  },
}

/** When the animal starts its move, after the clearing has grown in. */
const CHEER_AT = 0.6

const seconds = (s: number): CSSProperties => ({ animationDelay: `${s}s` })

/**
 * The "Fertig!" moment: today's clearing from the forest, shown large. The animal celebrates in
 * its own way and the flower (morning) or lantern (evening) lights up once; then everything rests.
 * With reduced motion the scene stands still and only the light fades on (`cheer-*` in index.css).
 */
export function DoneMoment({
  animal,
  evening,
  thought,
  className,
}: {
  animal: AnimalId
  evening: boolean
  /** Show the thought bubble with the item: the photo still has fields to uncover. */
  thought: boolean
  className?: string
}) {
  const { cheer, origin, seconds: length, lightAt, extras } = CHEER[animal]
  // Where the flower head or lantern sits in the stage's 300×220 box.
  const light = evening ? { x: 96.6, y: 133 } : { x: 90, y: 86 }
  return (
    <div className={`cheer-stage relative aspect-[300/220] ${className ?? ''}`}>
      <div className="absolute inset-0 animate-stage-in">
        <svg
          viewBox="0 0 300 220"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="done-light">
              <stop offset="0%" stopColor={evening ? '#ffd27a' : '#fff1b0'} stopOpacity="0.85" />
              <stop offset="100%" stopColor={evening ? '#ffd27a' : '#fff1b0'} stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* The warm pool of light that stays once lit. */}
          <ellipse
            cx={light.x}
            cy={light.y + 30}
            rx="125"
            ry="95"
            fill="url(#done-light)"
            className="cheer-fade animate-light-on"
            style={seconds(lightAt)}
          />
          {/* Today's clearing, as in the forest: a meadow with the dashed "today" ring. */}
          <ellipse
            cx="150"
            cy="186"
            rx="142"
            ry="30"
            fill="none"
            stroke="#fffbe8"
            strokeWidth="4"
            strokeDasharray="12 10"
            opacity="0.9"
          />
          <ellipse cx="150" cy="186" rx="128" ry="24" fill={evening ? '#7f9f55' : '#a8cc76'} />
          <Grass x={40} y={190} s={0.9} />
          <Grass x={262} y={184} s={0.8} />
          <Grass x={146} y={204} s={0.7} />
          {/* Unlit, then lit: a soft cross-fade. */}
          <g className="cheer-fade animate-light-off" style={seconds(lightAt)}>
            {evening ? (
              <EveningLantern x={70} y={194} lit={false} s={1.9} />
            ) : (
              <MorningFlower x={90} y={192} open={false} s={1.9} />
            )}
          </g>
          <g className="cheer-fade animate-light-on" style={seconds(lightAt)}>
            {evening ? (
              <EveningLantern x={70} y={194} lit s={1.9} />
            ) : (
              <MorningFlower x={90} y={192} open s={1.9} />
            )}
          </g>
          {/* One ring of light spreading out, once. */}
          <circle
            cx={light.x}
            cy={light.y}
            r="34"
            fill="none"
            stroke={evening ? '#ffe3a0' : '#fff6c8'}
            strokeWidth="4"
            className="cheer-burst animate-light-burst"
            style={{ ...seconds(lightAt), transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        </svg>

        {/* The animal stands on the clearing, right of the flower or lantern. */}
        <div className="absolute bottom-[10%] left-[51%] w-[44%]">
          <div className={`${cheer} ${origin}`} style={seconds(CHEER_AT)}>
            <div className="animate-bob" style={seconds(CHEER_AT + length)}>
              <div className="relative">
                <Animal animal={animal} />
                {extras && (
                  <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0 h-full w-full overflow-visible"
                    aria-hidden="true"
                  >
                    {extras}
                  </svg>
                )}
              </div>
            </div>
          </div>
          {thought && (
            <div
              className="pointer-events-none absolute bottom-[86%] left-[52%] w-[62%] animate-fadein"
              style={seconds(CHEER_AT + length + 0.3)}
            >
              <ThoughtBubble animal={animal} className="animate-bob" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const style = (origin: string, delay: number): CSSProperties => ({
  transformOrigin: origin,
  animationDelay: `${delay}s`,
})

/** The owl's wings, drawn over its folded ones, open wide and beat slowly. */
function OwlWings() {
  return (
    <g fill="#7d5a3c">
      <path
        d="M22 60 C14 70 18 86 30 90 C26 80 26 70 22 60 Z"
        className="animate-owl-wing-left"
        style={style('24px 62px', CHEER_AT)}
      />
      <path
        d="M78 60 C86 70 82 86 70 90 C74 80 74 70 78 60 Z"
        className="animate-owl-wing-right"
        style={style('76px 62px', CHEER_AT)}
      />
    </g>
  )
}

/** The bear's paw rubbing its tummy in two slow circles. */
function BearPaw() {
  return (
    <g className="animate-bear-rub" style={style('58px 80px', CHEER_AT)}>
      <ellipse cx="58" cy="80" rx="8.5" ry="7" fill="#8a5a3b" stroke="#6f462d" strokeWidth="1.6" />
      <path
        d="M54 76.5 v5 M58 76 v6 M62 76.5 v5"
        stroke="#6f462d"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </g>
  )
}

/** The koala closes its eyes into two happy arcs while it sways. */
function KoalaHappyEyes() {
  return (
    <g className="animate-koala-eyes" style={style('50px 39px', CHEER_AT)}>
      {[41, 59].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="39" rx="4.4" ry="5" fill="#b4b9be" />
          <path
            d={`M${x - 3.4} 40.5 Q${x} 36.5 ${x + 3.4} 40.5`}
            fill="none"
            stroke="#2b2118"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  )
}
