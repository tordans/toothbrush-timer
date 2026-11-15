import type { Animal } from '@/features/family/schema'

/**
 * What covers the photo of the week, per animal, and how the animal clears it away (see
 * PhotoCover.tsx and reveal-motion.ts). The forest shows the item in the animal's thought bubble
 * while it may still uncover fields.
 * - squirrel: hazelnuts in leaves; grabs a nut, nibbles it and scampers off with it
 * - hedgehog: autumn leaves; rolls through them, the leaves stick to its spines
 * - fox: snow; dives head first into it with a mouse jump, the snow puffs away
 * - owl: night clouds; flaps its wings and blows the cloud away
 * - rabbit: grass with clover; nibbles it down
 * - bear: blueberry bushes; eats the berries
 * - koala: eucalyptus; munches the leaves
 */

/** The item of an animal, drawn in a 40×40 box. */
export function AnimalItem({
  animal,
  className,
  ...box
}: {
  animal: Animal
  className?: string
  /** Position and size, when the item sits inside another SVG (the forest). */
  x?: number
  y?: number
  width?: number
  height?: number
}) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" {...box}>
      {ITEM_ART[animal]}
    </svg>
  )
}

/** The bare item art in its 40×40 coordinates, for drawing it inside another SVG. */
export function AnimalItemArt({ animal }: { animal: Animal }) {
  return ITEM_ART[animal]
}

const ITEM_ART: Record<Animal, React.ReactNode> = {
  // A hazelnut with its cap.
  squirrel: (
    <g>
      <path d="M20 12 C30 12 32 24 28 30 C25 35 15 35 12 30 C8 24 10 12 20 12 Z" fill="#b8763a" />
      <path
        d="M14 24 C16 31 22 33 26 30"
        fill="none"
        stroke="#d99a5c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M9 15 C12 7 28 7 31 15 C26 17 14 17 9 15 Z" fill="#7a4e26" />
      <path d="M20 9 L21 4" stroke="#5b3a1c" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  // An orange maple leaf.
  hedgehog: (
    <g>
      <path
        d="M20 4 L23 12 L30 9 L28 17 L36 18 L29 23 L32 29 L23 27 L21 35 L19 35 L17 27 L8 29 L11 23 L4 18 L12 17 L10 9 L17 12 Z"
        fill="#e07a2e"
      />
      <path d="M20 12 L20 35" stroke="#a8501c" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),
  // A snowflake.
  fox: (
    <g stroke="#9cc8e6" strokeWidth="3" strokeLinecap="round">
      {[0, 60, 120].map((r) => (
        <g key={r} transform={`rotate(${r} 20 20)`}>
          <path d="M20 5 L20 35" />
          <path d="M16 9 L20 13 L24 9 M16 31 L20 27 L24 31" fill="none" />
        </g>
      ))}
    </g>
  ),
  // A small night cloud.
  owl: (
    <g>
      <path
        d="M10 30 C4 30 4 21 11 21 C11 13 21 11 24 17 C28 13 36 16 34 23 C39 24 38 30 33 30 Z"
        fill="#c9cfe8"
      />
      <circle cx="31" cy="9" r="2" fill="#ffd96b" />
    </g>
  ),
  // A four-leaf clover.
  rabbit: (
    <g>
      <path
        d="M20 22 C21 29 24 33 27 36"
        fill="none"
        stroke="#4d8a36"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {[0, 90, 180, 270].map((r) => (
        <path
          key={r}
          transform={`rotate(${r} 20 20)`}
          d="M20 20 C14 16 13 8 18 8 C20 8 20 11 20 11 C20 11 20 8 22 8 C27 8 26 16 20 20 Z"
          fill="#6db34a"
        />
      ))}
    </g>
  ),
  // Two blueberries with a leaf.
  bear: (
    <g>
      <path d="M22 8 C30 4 36 10 34 14 C28 15 24 12 22 8 Z" fill="#5f9b45" />
      <circle cx="15" cy="24" r="9" fill="#3f4f9e" />
      <circle cx="26" cy="27" r="8" fill="#4a5cb3" />
      <path
        d="M13 17 L15 19 L17 17 M24 21 L26 23 L28 21"
        fill="none"
        stroke="#2a3466"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  ),
  // A long blue-green eucalyptus leaf.
  koala: (
    <g>
      <path d="M8 34 C8 20 18 8 33 6 C33 20 22 32 8 34 Z" fill="#7fae96" />
      <path
        d="M8 34 C16 24 24 15 33 6"
        fill="none"
        stroke="#557d69"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </g>
  ),
}
