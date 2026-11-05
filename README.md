# Brushing Sparks

**Two minutes, four corners.** A calm toothbrushing timer for children, morning and evening.
UI in German. Planned home: <https://brush.ingsparks.de> (see [docs/naming.md](docs/naming.md)).

## What it does

- **The week is a path through a forest.** Seven clearings, Monday to Sunday. A morning brushing
  opens a flower, an evening brushing lights a lantern. The child's animal waits at today's
  clearing. Earlier weeks can be looked at with the arrows.
- **The timer:** two minutes in four corners of 30 seconds (top left, top right, bottom right,
  bottom left, seen like in a mirror). A ring shows the two minutes, the mouth shows the current
  corner. A soft bell at each change, optional calm music generated in the browser, pause,
  restart, stop. The screen stays on while brushing (Wake Lock, where supported). If the screen
  turns off or the app goes to the background, the timer pauses.
- **Several children,** each with an animal: fox, hedgehog, owl, rabbit, squirrel, bear.
- **For parents** (hold the gear for a second): children, correcting the last two weeks, sound,
  connecting phones.

### What it does not do, on purpose

No points, coins, stars as currency, stickers, albums, unlocks, streak counters or reminders that
something is about to be lost. Nothing appears during brushing except the timer, the current corner
and the animal. The only "reward" is that the week in the forest fills up.

## Data and sync

Every phone stores the state in `localStorage` and works without a network. With the family link
(`https://brush.ingsparks.de/#key=…`) phones also sync through a small PHP API with MariaDB on the
all-inkl web space. Records (children, brushings, settings) carry `updatedAt` and are merged one by
one; deletes are kept as tombstones. So two phones that brushed offline never lose each other's
entries, and a conflict on the server (`409`) is merged and saved again.

Server, endpoints, the family link, rotating it and deployment: [docs/central-storage.md](docs/central-storage.md).

## Supported devices

An old Android phone with Chrome 87 or newer, and iPhone with iOS 15 or newer. That is why:

- `browserslist` in `package.json` sets the JS target; `@vitejs/plugin-legacy` adds only the
  needed `core-js` polyfills to the modern bundle (no separate legacy bundle).
- **Tailwind CSS 3, not 4.** Tailwind 4 needs Chrome 111+. Avoid utilities that rely on newer CSS
  (`aspect-*`, `size-*`, `dvh`, `:has`, container queries).
- No `crypto.randomUUID`, `AbortSignal.timeout`, `toSorted` and similar in our own code;
  `eslint-plugin-compat` in oxlint checks this.

A small service worker (`public/sw.js`, production only) caches the app so it starts on weak Wi-Fi.
Add it to the home screen for a full-screen app.

## Development

Requires [Bun](https://bun.sh) ≥ 1.3.14 and Docker (for the local API).

```bash
bun install
bun run api-up   # PHP + MariaDB in Docker on http://localhost:8088
bun run dev      # http://localhost:5287, /api is proxied to the local API
```

Open <http://localhost:5287/#key=dev-family-key> to connect to the local API (a throwaway dev key
from `api/tests/config.php`). Without a key the app only stores locally.

Dev shortcut: `localStorage.setItem('brush-speed', '20')` runs the two minutes in six seconds
(only in `bun run dev`).

| Script                    | Role                                                     |
| ------------------------- | -------------------------------------------------------- |
| `dev`                     | Vite dev server on port 5287                             |
| `build` / `preview`       | Production build and local preview                       |
| `type-check`              | `tsc --noEmit` (TypeScript 7)                            |
| `lint` / `lint-check`     | Oxlint (mutating / read-only)                            |
| `format` / `format-check` | oxfmt (mutating / read-only)                             |
| `test-run`                | Vitest unit tests in `tests/`                            |
| `api-up` / `api-down`     | Local API in Docker                                      |
| `api-test`                | API tests (`bun test`) against the running local API     |
| `check`                   | Local verify: type-check, lint, format, tests, knip-warn |
| `check-ci`                | Read-only verify used by CI                              |

Stack: Vite 8, React 19 with React Compiler, TanStack Router (search params validated with Zod 4),
Zustand (persisted), date-fns, Tailwind CSS 3, Web Audio API. Server: plain PHP 8.4, no framework.

## License

[AGPL-3.0](LICENSE.md)
