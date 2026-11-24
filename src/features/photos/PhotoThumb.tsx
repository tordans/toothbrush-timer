import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import type { Photo } from './api'
import { usePhotoUrl } from './use-photo-url'

/**
 * A square thumbnail; the box has the width of its parent. The photo is only requested once the
 * tile comes near the screen, because a family may have hundreds of photos and each needs its own
 * authorized request. `contain` shows the whole photo, so landscape and portrait stay
 * recognisable; the default fills the square.
 */
export function PhotoThumb({
  photo,
  contain = false,
  className,
}: {
  photo: Photo
  contain?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (near || !el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [near])
  const url = usePhotoUrl(near ? photo.id : undefined)

  return (
    <div
      ref={ref}
      className={twMerge(
        'relative w-full overflow-hidden rounded-xl bg-moss-100 pb-[100%]',
        className,
      )}
      aria-hidden={url ? undefined : true}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={twMerge(
            'absolute inset-0 h-full w-full',
            contain ? 'object-contain' : 'object-cover',
          )}
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-moss-600/40"
        >
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m4 18 5-5 4 4 3-3 4 4" />
        </svg>
      )}
    </div>
  )
}
