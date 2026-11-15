import type { Animal } from '@/features/family/schema'
import { AnimalItem } from './animal-items'

const OUTLINE = '#c7dba7'

/** The round cloud of a thought bubble, drawn twice: a wider one for the outline, then the fill. */
function Cloud({ stroke }: { stroke?: boolean }) {
  const props = stroke
    ? { fill: OUTLINE, stroke: OUTLINE, strokeWidth: 5, strokeLinejoin: 'round' as const }
    : { fill: '#ffffff' }
  return (
    <g {...props}>
      <ellipse cx="0" cy="2" rx="29" ry="19" />
      <circle cx="-19" cy="-5" r="14" />
      <circle cx="1" cy="-12" r="17" />
      <circle cx="20" cy="-4" r="14" />
    </g>
  )
}

/**
 * The thought bubble above an animal in the forest: two small circles leading up to a cloud with
 * the animal's item inside ("I look forward to hopping onto the photo"). Drawn in the 100×100 box
 * of the animal, above its head. Tapping it opens the photo; it never shows a "done" state.
 */
export function ForestThoughtBubble({ animal, onTap }: { animal: Animal; onTap: () => void }) {
  return (
    <g
      className="animate-bob"
      style={{ animationDelay: '-1.2s', cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      aria-label="Zum Foto"
      onClick={(e) => {
        // The forest ground grows a plant for every tap; not for this one.
        e.stopPropagation()
        onTap()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap()
        }
      }}
    >
      {/* A little larger than the animal's own scale suggests: small fingers, small forest. */}
      <g transform="translate(55 -5) scale(1.3) translate(-55 5)">
        {/* Invisible tap area, 44 px or more on screen, ending above the animal's own tap area. */}
        <rect x="22" y="-92" width="96" height="90" fill="transparent" />
        <g fill="#ffffff" stroke={OUTLINE} strokeWidth="2.5">
          <circle cx="55" cy="-5" r="4.5" />
          <circle cx="62" cy="-20" r="7" />
        </g>
        <g transform="translate(78 -50)">
          <Cloud stroke />
          <Cloud />
          <AnimalItem animal={animal} x={-17} y={-26} width={34} height={34} />
        </g>
      </g>
    </g>
  )
}

/** The same bubble in the page (HTML), for the brushing page. */
export function ThoughtBubble({ animal, className }: { animal: Animal; className?: string }) {
  return (
    <svg viewBox="0 0 100 90" className={className} aria-hidden="true">
      <g fill="#ffffff" stroke={OUTLINE} strokeWidth="2.5">
        <circle cx="22" cy="82" r="5" />
        <circle cx="30" cy="68" r="7.5" />
      </g>
      <g transform="translate(58 34)">
        <Cloud stroke />
        <Cloud />
        <AnimalItem animal={animal} x={-17} y={-26} width={34} height={34} />
      </g>
    </svg>
  )
}
