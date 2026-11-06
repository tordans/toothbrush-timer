// Small inline icons (stroke style), sized by className.

type P = { className?: string }

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

export const SunIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <path key={a} d="M12 2.5v2.5" transform={`rotate(${a} 12 12)`} />
    ))}
  </svg>
)

export const MoonIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" stroke="none" />
  </svg>
)

export const PlayIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M7 4.5v15l12-7.5Z" fill="currentColor" />
  </svg>
)

export const PauseIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
  </svg>
)

export const RestartIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4.5h4.5" />
  </svg>
)

export const CloseIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const GearIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
)

export const ChevronLeft = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const ChevronRight = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)

export const MusicIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" fill="currentColor" />
    <circle cx="17" cy="16" r="3" fill="currentColor" />
  </svg>
)

export const MusicOffIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 18V5l11-2v13" opacity="0.5" />
    <circle cx="6" cy="18" r="3" opacity="0.5" />
    <circle cx="17" cy="16" r="3" opacity="0.5" />
    <path d="M3 3l18 18" />
  </svg>
)

export const CalendarIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)
