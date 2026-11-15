import { useEffect } from 'react'

/** The colour of the screen behind the bottom bar and the parents' pages (moss-800). */
const MOSS_BAR = '#354722'

/**
 * Colours the status bar above the page in the Home Screen app (iPhone, iPad, Android) to match
 * the top of the screen, so the bar reads as part of the app. The browser tints its own bars with
 * it too, where it does that. Leaving the page puts the default back.
 */
export function useThemeColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) return
    meta.content = color
    return () => {
      meta.content = MOSS_BAR
    }
  }, [color])
}
