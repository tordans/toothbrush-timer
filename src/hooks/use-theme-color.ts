import { useEffect } from 'react'

/** The colour of the screen behind the bottom bar and the parents' pages (moss-800). */
const MOSS_BAR = '#354722'

/**
 * Matches the edge above the page to the top of the screen, so it reads as part of the app.
 *
 * In the Home Screen app on iPhone and iPad (iOS 26 and later) the status bar has no colour of its
 * own: the system fades the page's background colour over the top of the content. Measured in the
 * simulator: neither theme-color (meta or manifest) nor changing it later has any effect there. So
 * the page background takes the colour of the top of the screen (the sky in the forest), and the
 * fade disappears into it. theme-color is still set for browsers that tint their bars with it.
 * Leaving the page puts the defaults back.
 */
export function useThemeColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = color
    document.documentElement.style.backgroundColor = color
    document.body.style.backgroundColor = color
    return () => {
      if (meta) meta.content = MOSS_BAR
      document.documentElement.style.backgroundColor = ''
      document.body.style.backgroundColor = ''
    }
  }, [color])
}
