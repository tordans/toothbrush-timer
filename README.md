# brush.ingsparks.de – Zahnputz-Timer für Kinder

A calm two-minute toothbrushing timer for children, morning and evening: two minutes, four
corners. UI in German. Home: <https://brush.ingsparks.de> (name: [docs/naming.md](docs/naming.md)).

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

Every phone stores the state in `localStorage` and works without a network. With a family link
(`https://brush.ingsparks.de/#key=…`) phones also sync through a small PHP API with MariaDB on the
all-inkl web space.

**Several families, one server.** A family is created in the app ("Für Eltern" → "Neue Familie
anlegen") with an invite word that the owner hands out in person; the server answers with a new
family key and the app shows the family link. There is no sign-up and no login. The link can be
renewed in the app; the old one stops working at once. Records (children, brushings, settings) carry `updatedAt` and are merged one by
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

If port 8088 is taken, set `BRUSH_API_PORT` (e.g. `8089`) for `api-up`, `api-test` and `dev`.

To try the server sync locally: "Für Eltern" → "Neue Familie anlegen" with the throwaway invite word
`dev-invite` (from `api/tests/config.php`). Without a family the app only stores locally.

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
| `api-check`               | `api-up`, then `api-test`                                |
| `check`                   | Local verify: type-check, lint, format, tests, knip-warn |
| `check-ci`                | Read-only verify (type-check, lint, format, tests)       |
| `check-pre-push`          | `check-ci` + strict knip + API tests; the husky pre-push |

**Checks run locally, not in CI** (same as the sibling apps): the husky `pre-push` hook runs
`check-pre-push`, Docker must be running. Dependabot (`.github/dependabot.yml`, first Thursday of
the month, one PR per ecosystem) is therefore not checked by GitHub: check out a Dependabot branch
and push or run `bun run check-pre-push` before merging. Deployment: [docs/central-storage.md](docs/central-storage.md).

Stack: Vite 8, React 19 with React Compiler, TanStack Router (search params validated with Zod 4),
Zustand (persisted), date-fns, Tailwind CSS 3, Web Audio API. Server: plain PHP 8.4, no framework.

## License

[AGPL-3.0](LICENSE.md)
