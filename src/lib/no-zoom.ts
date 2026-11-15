/**
 * In the Home Screen app a pinch would zoom the whole app, and nothing brings it back. There it
 * is blocked. In the browser people can still zoom the website. iOS's own Zoom (Settings >
 * Accessibility) works either way. Double-tap zoom is off everywhere (touch-action in index.css).
 */
export function preventPinchZoomInHomeScreenApp() {
  const homeScreenApp =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (!homeScreenApp) return
  // Safari's own gesture events; other browsers in this mode respect the touch-action rule.
  for (const type of ['gesturestart', 'gesturechange']) {
    document.addEventListener(type, (event) => event.preventDefault(), { passive: false })
  }
}
