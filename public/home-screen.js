// iPhone and iPad give a web app on the Home Screen its own, empty storage. Without help it
// would start without the family link. Safari reads the manifest once, when the page loads,
// and uses its start address for the new icon. So on iOS this page gets a manifest whose start
// address carries the family key: from the link just opened, or the one this browser already
// stores. Other browsers share storage with their installed apps and keep the plain manifest.
//
// Plain ES5 on purpose: this file is not built and also runs on old Android phones.
// Name, colours and icons must match /manifest.webmanifest.
;(function () {
  var link = document.createElement('link')
  link.rel = 'manifest'
  link.href = '/manifest.webmanifest'
  try {
    var iosSafari = 'standalone' in navigator && !navigator.standalone
    var fromLink = /(?:^#|&)key=([^&]+)/.exec(location.hash)
    var stored = JSON.parse(localStorage.getItem('brushing-sparks') || 'null')
    var key = fromLink
      ? decodeURIComponent(fromLink[1])
      : stored && stored.state && stored.state.familyKey
    if (iosSafari && key) {
      var origin = location.origin
      var manifest = {
        name: 'brush.ingsparks.de – Zahnputz-Timer für Kinder',
        short_name: 'Zähneputzen',
        lang: 'de',
        start_url: origin + '/#key=' + encodeURIComponent(key),
        scope: origin + '/',
        display: 'standalone',
        background_color: '#2d3c1f',
        theme_color: '#405825',
        icons: [
          { src: origin + '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: origin + '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      }
      link.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest))
    }
  } catch (_error) {
    // Storage blocked or unreadable: keep the plain manifest.
  }
  document.head.appendChild(link)
})()
