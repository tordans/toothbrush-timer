import type { Animal } from '@/features/family/schema'

/**
 * The moves of the animal on the photo: hopping (or flying) from field to field, and the way
 * each animal clears a field. Everything runs on the Web Animations API on plain HTML elements,
 * so it works on old iPad Safari without any library.
 *
 * Coordinates are pixels inside the photo box. An animal's position is the point between its
 * feet; the drawings face left by nature, the `face` element mirrors them when needed.
 */

export type Point = { x: number; y: number }

export type Play = (
  el: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) => Promise<void>

export type Grid = { width: number; height: number; cols: number; rows: number }

export type Cell = {
  index: number
  x: number
  y: number
  cx: number
  cy: number
  w: number
  h: number
  /** 1: the animal stands right of the field, -1: left of it. */
  side: 1 | -1
}

export function cellOf(grid: Grid, index: number): Cell {
  const w = grid.width / grid.cols
  const h = grid.height / grid.rows
  const col = index % grid.cols
  const row = Math.floor(index / grid.cols)
  const x = col * w
  const y = row * h
  // Stand on the side towards the middle of the photo, so the animal stays on it.
  return { index, x, y, cx: x + w / 2, cy: y + h / 2, w, h, side: col < grid.cols / 2 ? 1 : -1 }
}

/** Size of the animal: a bit more than one field, but never tiny or huge. */
export function animalSize(grid: Grid): number {
  const c = Math.min(grid.width / grid.cols, grid.height / grid.rows)
  return Math.max(56, Math.min(190, c * 1.55))
}

/** Size of the little flying things (the item, crumbs, puffs). */
export function bitSize(grid: Grid): number {
  return Math.min(grid.width / grid.cols, grid.height / grid.rows) * 0.6
}

export const moverAt = (p: Point, s: number) => `translate(${p.x - s / 2}px, ${p.y - s}px)`

export const bitAt = (p: Point, b: number, scale = 1, rot = 0) =>
  `translate(${p.x - b / 2}px, ${p.y - b / 2}px) rotate(${rot}deg) scale(${scale})`

/** Where the animal stands (or, the owl, hovers) to clear a field. */
export function besideCell(animal: Animal, cell: Cell, s: number, side = cell.side): Point {
  return {
    x: cell.cx + side * (cell.w * 0.5 + s * 0.22),
    y: animal === 'owl' ? cell.cy + cell.h * 0.05 : cell.cy + cell.h * 0.45,
  }
}

const mouthOf = (p: Point, s: number, toward: number): Point => ({
  x: p.x + toward * s * 0.14,
  y: p.y - s * 0.45,
})

/** Mirror the animal so it looks in direction `dir` (1 right, -1 left). */
export function lookTo(face: HTMLElement, dir: number) {
  face.style.transform = dir > 0 ? 'scaleX(-1)' : 'none'
}

/** Points along hops from `from` to `to`, `n` hops of height `h`. */
function hopPath(from: Point, to: Point, n: number, h: number, s: number): Keyframe[] {
  const steps = n * 4
  return Array.from({ length: steps + 1 }, (_, k) => {
    const t = k / steps
    const u = (t * n) % 1
    const lift = k === steps ? 0 : 4 * h * u * (1 - u)
    return {
      transform: moverAt(
        { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - lift },
        s,
      ),
    }
  })
}

/**
 * Moves the animal: the owl flies in one arc, everyone else hops. Between two hops `keepGoing`
 * may stop the trip, so the animal can turn to a new goal. Returns where the animal stands.
 */
export async function travel(
  play: Play,
  els: { mover: HTMLElement; face: HTMLElement; body: HTMLElement },
  animal: Animal,
  from: Point,
  to: Point,
  s: number,
  keepGoing: () => boolean = () => true,
): Promise<Point> {
  const dx = to.x - from.x
  const dist = Math.hypot(dx, to.y - from.y)
  if (dist < 2) return to
  if (Math.abs(dx) > 2) lookTo(els.face, dx)
  if (animal === 'owl') {
    const duration = Math.max(450, Math.min(900, dist * 1.4))
    const flaps = Math.max(2, Math.round(duration / 220))
    await Promise.all([
      play(els.mover, hopPath(from, to, 1, Math.min(dist * 0.3, s * 0.8) + s * 0.2, s), {
        duration,
      }),
      play(
        els.body,
        [
          { transform: 'none' },
          { transform: `translateY(${-s * 0.04}px) scaleX(1.14)` },
          { transform: 'none' },
        ],
        { duration: duration / flaps, iterations: flaps },
      ),
    ])
    return to
  }
  const quick = animal === 'squirrel'
  const n = Math.max(1, Math.round(dist / (s * (quick ? 0.7 : 0.8))))
  const hop = quick ? 190 : 260
  let at = from
  for (let k = 1; k <= n; k++) {
    const next = { x: from.x + (dx * k) / n, y: from.y + ((to.y - from.y) * k) / n }
    await Promise.all([
      play(els.mover, hopPath(at, next, 1, s * (quick ? 0.18 : 0.28), s), { duration: hop }),
      play(
        els.body,
        [
          { transform: 'none' },
          { transform: 'scale(0.94, 1.06)', offset: 0.3 },
          { transform: 'scale(1.06, 0.92)', offset: 0.9 },
          { transform: 'none' },
        ],
        { duration: hop },
      ),
    ])
    at = next
    if (k < n && !keepGoing()) return at
  }
  return at
}

export type Stage = {
  play: Play
  mover: HTMLElement
  face: HTMLElement
  body: HTMLElement
  /** The cover of this field (without its item), on top of the photo. */
  piece: HTMLElement
  /** bits[0] is the field's item, the others are crumbs, puffs, leaves… */
  bits: HTMLElement[]
  animal: Animal
  cell: Cell
  /** The animal's size and the bits' size in px. */
  s: number
  b: number
  /** Where the animal stands now (beside the field). */
  pos: Point
  /** The field's item where it lies on the cover. */
  hero: { x: number; y: number; rot: number; scale: number }
  /** The hedgehog keeps a leaf on its spines. */
  addStuckLeaf: () => void
}

/** Random-looking but fixed spots inside a field, for the extra bits. */
function spotIn(cell: Cell, i: number): Point {
  const fx = [0.3, 0.7, 0.45, 0.62, 0.25][i % 5]!
  const fy = [0.35, 0.3, 0.7, 0.62, 0.6][i % 5]!
  return { x: cell.x + fx * cell.w, y: cell.y + fy * cell.h }
}

const show = (el: HTMLElement, transform: string) => {
  el.style.transform = transform
  el.style.opacity = '1'
}

/** Flies a bit from `from` to `to` in a little arc and lets it vanish there. */
function fly(
  st: Stage,
  el: HTMLElement,
  from: Point,
  to: Point,
  options: KeyframeAnimationOptions,
  scale = 1,
  rot = 0,
) {
  const { b } = st
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - st.cell.h * 0.35 }
  show(el, bitAt(from, b, scale, rot))
  return st.play(
    el,
    [
      { transform: bitAt(from, b, scale, rot), opacity: 1 },
      { transform: bitAt(mid, b, scale * 0.9, rot / 2), opacity: 1, offset: 0.5 },
      { transform: bitAt(to, b, scale * 0.6, 0), opacity: 1, offset: 0.85 },
      { transform: bitAt(to, b, scale * 0.2, 0), opacity: 0 },
    ],
    { easing: 'ease-in-out', ...options },
  )
}

/** Lean towards the field (the drawings face left, so forward is a negative turn). */
const lean = (st: Stage, deg: number, duration = 160) =>
  st.play(st.body, [{ transform: 'none' }, { transform: `rotate(${deg}deg)` }], {
    duration,
    easing: 'ease-out',
  })

const straighten = (st: Stage, from: string, duration = 160) =>
  st.play(st.body, [{ transform: from }, { transform: 'none' }], {
    duration,
    easing: 'ease-in-out',
  })

/** Small chewing wobble while leaning. */
function chew(st: Stage, deg: number, duration: number) {
  return st.play(
    st.body,
    [
      { transform: `rotate(${deg}deg)` },
      { transform: `rotate(${deg + 4}deg) translateY(${st.s * 0.02}px)` },
      { transform: `rotate(${deg}deg)` },
    ],
    { duration: duration / 5, iterations: 5 },
  )
}

const heroStart = (st: Stage) => bitAt(st.hero, st.b, st.hero.scale, st.hero.rot)

/** Each animal clears a field in its own way, in about 1–1.5 s. Returns where it ends up. */
export const CLEAR: Record<Animal, (st: Stage) => Promise<Point>> = {
  // Grabs the nut, nibbles it (crumbs fall) and tucks it away in its cheeks.
  squirrel: async (st) => {
    const toward = -st.cell.side
    const mouth = mouthOf(st.pos, st.s, toward)
    const [nut, ...crumbs] = st.bits
    show(nut!, heroStart(st))
    await Promise.all([
      lean(st, -14),
      st.play(st.piece, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 60 }),
      st.play(nut!, [{ transform: heroStart(st) }, { transform: bitAt(mouth, st.b, 0.8) }], {
        duration: 360,
        delay: 100,
        easing: 'ease-in-out',
      }),
    ])
    await Promise.all([
      chew(st, -14, 600),
      st.play(
        nut!,
        [
          { transform: bitAt(mouth, st.b, 0.8, 0) },
          { transform: bitAt(mouth, st.b, 0.75, -12) },
          { transform: bitAt(mouth, st.b, 0.7, 10) },
          { transform: bitAt(mouth, st.b, 0.62, -8) },
          { transform: bitAt(mouth, st.b, 0.55, 0) },
        ],
        { duration: 600 },
      ),
      ...crumbs.slice(0, 3).map((crumb, i) => {
        show(crumb, bitAt(mouth, st.b, 0.4))
        return st.play(
          crumb,
          [
            { transform: bitAt(mouth, st.b, 0.4), opacity: 1 },
            {
              transform: bitAt(
                { x: mouth.x + (i - 1) * st.b * 0.4, y: mouth.y + st.s * 0.35 },
                st.b,
                0.3,
              ),
              opacity: 0,
            },
          ],
          { duration: 380, delay: i * 140, easing: 'ease-in' },
        )
      }),
    ])
    await Promise.all([
      st.play(nut!, [{ opacity: 1 }, { opacity: 0, transform: bitAt(mouth, st.b, 0.1) }], {
        duration: 180,
      }),
      straighten(st, 'rotate(-14deg)'),
    ])
    return st.pos
  },

  // Curls up, rolls right through the leaves, and the leaves stay stuck on its spines.
  hedgehog: async (st) => {
    const { s, cell } = st
    const toward = -cell.side
    const end = besideCell('hedgehog', cell, s, -cell.side as 1 | -1)
    const back = { x: end.x, y: end.y - s * 0.5 }
    const curled = (deg: number) => `translateY(${-s * 0.08}px) scale(0.82) rotate(${deg}deg)`
    st.body.style.transformOrigin = '50% 62%'
    await st.play(st.body, [{ transform: 'none' }, { transform: curled(0) }], { duration: 180 })
    const [leaf, ...more] = st.bits
    show(leaf!, heroStart(st))
    await Promise.all([
      st.play(st.mover, [{ transform: moverAt(st.pos, s) }, { transform: moverAt(end, s) }], {
        duration: 850,
        easing: 'ease-in-out',
      }),
      st.play(st.body, [{ transform: curled(0) }, { transform: curled(-720) }], {
        duration: 850,
        easing: 'ease-in-out',
      }),
      st.play(
        st.piece,
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: `translateX(${toward * cell.w * 0.7}px) scale(0.4)` },
        ],
        { duration: 450, delay: 280, easing: 'ease-in' },
      ),
      st.play(leaf!, [{ transform: heroStart(st) }, { transform: bitAt(back, st.b, 0.6, 30) }], {
        duration: 420,
        delay: 320,
        easing: 'ease-in',
      }),
      ...more
        .slice(0, 2)
        .map((bit, i) =>
          fly(st, bit, spotIn(cell, i), back, { duration: 400, delay: 300 + i * 80 }, 0.6, 40),
        ),
    ])
    // The rolled leaf now sits on the spines.
    leaf!.style.opacity = '0'
    st.addStuckLeaf()
    st.body.style.transform = curled(0)
    await st.play(st.body, [{ transform: curled(0) }, { transform: 'none' }], { duration: 200 })
    st.body.style.transformOrigin = ''
    lookTo(st.face, -toward)
    return end
  },

  // The mouse pounce: a high jump, head first into the snow, which puffs up all around.
  fox: async (st) => {
    const { s, cell } = st
    const toward = -cell.side
    // Upside down, the head is near the bottom of the drawing: aim it at the field.
    const dive = { x: cell.cx, y: cell.cy + cell.h * 0.15 + s * 0.3 }
    st.body.style.transformOrigin = '50% 50%'
    await st.play(st.body, [{ transform: 'none' }, { transform: 'scale(1.08, 0.85)' }], {
      duration: 170,
      easing: 'ease-out',
    })
    await Promise.all([
      st.play(st.mover, hopPath(st.pos, dive, 1, Math.max(cell.h * 1.3, s * 0.7), s), {
        duration: 480,
      }),
      st.play(
        st.body,
        [
          { transform: 'scale(1.08, 0.85)' },
          { transform: 'scale(0.95, 1.05) rotate(-50deg)', offset: 0.45 },
          { transform: 'scale(0.9) rotate(-180deg)' },
        ],
        { duration: 480, easing: 'ease-in' },
      ),
    ])
    const [flake, ...puffs] = st.bits
    show(flake!, heroStart(st))
    const centre = { x: cell.cx, y: cell.cy }
    await Promise.all([
      st.play(
        st.piece,
        [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(1.45)' },
        ],
        { duration: 450, easing: 'ease-out' },
      ),
      st.play(
        flake!,
        [
          { transform: heroStart(st), opacity: 1 },
          {
            transform: bitAt(
              { x: centre.x - toward * cell.w * 0.6, y: centre.y - cell.h },
              st.b,
              0.5,
              120,
            ),
            opacity: 0,
          },
        ],
        { duration: 550, easing: 'ease-out' },
      ),
      ...puffs.map((puff, i) => {
        const a = (i / puffs.length) * Math.PI * 2 + 0.4
        const to = {
          x: centre.x + Math.cos(a) * cell.w * 0.9,
          y: centre.y + Math.sin(a) * cell.h * 0.7 - cell.h * 0.3,
        }
        show(puff, bitAt(centre, st.b, 0.4))
        return st.play(
          puff,
          [
            { transform: bitAt(centre, st.b, 0.4), opacity: 1 },
            { transform: bitAt(to, st.b, 1.1), opacity: 0 },
          ],
          { duration: 520, easing: 'ease-out' },
        )
      }),
      st.play(
        st.body,
        [
          { transform: 'scale(0.9) rotate(-180deg)' },
          { transform: 'scale(0.9) rotate(-170deg)' },
          { transform: 'scale(0.9) rotate(-190deg)' },
          { transform: 'scale(0.9) rotate(-180deg)' },
        ],
        { duration: 450 },
      ),
    ])
    // Pops out with a little flip and lands beside the field again.
    await Promise.all([
      st.play(st.mover, hopPath(dive, st.pos, 1, s * 0.45, s), { duration: 420 }),
      st.play(
        st.body,
        [{ transform: 'scale(0.9) rotate(-180deg)' }, { transform: 'scale(1) rotate(-360deg)' }],
        { duration: 420, easing: 'ease-out' },
      ),
    ])
    st.body.style.transform = 'none'
    st.body.style.transformOrigin = ''
    return st.pos
  },

  // Hovers, flaps its wings and blows the cloud away, with a few gusts of wind.
  owl: async (st) => {
    const { s, cell } = st
    const toward = -cell.side
    const [cloud, ...gusts] = st.bits
    show(cloud!, heroStart(st))
    const away = (k: number, dy = 0) => `translate(${toward * cell.w * k}px, ${dy}px)`
    await Promise.all([
      st.play(
        st.body,
        [
          { transform: 'none' },
          { transform: `translateY(${-s * 0.05}px) scaleX(1.16)` },
          { transform: 'none' },
        ],
        { duration: 230, iterations: 5 },
      ),
      st.play(
        st.piece,
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0.9, transform: `${away(0.4)} scale(1.04)`, offset: 0.35 },
          { opacity: 0, transform: `${away(1.8, -cell.h * 0.2)} scale(1.15)` },
        ],
        { duration: 950, delay: 150, easing: 'ease-in' },
      ),
      st.play(
        cloud!,
        [
          { transform: heroStart(st), opacity: 1 },
          {
            transform: bitAt(
              { x: st.hero.x + toward * cell.w * 2.2, y: st.hero.y - cell.h * 0.3 },
              st.b,
              st.hero.scale * 1.1,
            ),
            opacity: 0,
          },
        ],
        { duration: 1000, delay: 200, easing: 'ease-in' },
      ),
      ...gusts.slice(0, 3).map((gust, i) => {
        const from = {
          x: st.pos.x + toward * s * 0.25,
          y: st.pos.y - s * 0.45 + (i - 1) * cell.h * 0.25,
        }
        const to = { x: from.x + toward * cell.w * 2, y: from.y }
        // The wind streak is drawn going right; turn it for wind to the left.
        const rot = toward > 0 ? 0 : 180
        show(gust, bitAt(from, st.b, 0.8, rot))
        gust.style.opacity = '0'
        return st.play(
          gust,
          [
            { transform: bitAt(from, st.b, 0.8, rot), opacity: 0 },
            { opacity: 1, offset: 0.3 },
            { transform: bitAt(to, st.b, 1, rot), opacity: 0 },
          ],
          { duration: 650, delay: 120 + i * 160, easing: 'ease-out' },
        )
      }),
    ])
    return st.pos
  },

  // Nibbles the grass down, bite by bite, and eats the clover.
  rabbit: async (st) => {
    const { cell } = st
    const toward = -cell.side
    const mouth = mouthOf(st.pos, st.s, toward)
    const [clover, ...blades] = st.bits
    show(clover!, heroStart(st))
    st.piece.style.transformOrigin = `${cell.cx}px ${cell.y + cell.h}px`
    await lean(st, -12)
    await Promise.all([
      chew(st, -12, 1000),
      st.play(
        st.piece,
        [
          { transform: 'scaleY(1)', opacity: 1 },
          { transform: 'scaleY(1)', offset: 0.12 },
          { transform: 'scaleY(0.66)', offset: 0.3 },
          { transform: 'scaleY(0.66)', offset: 0.45 },
          { transform: 'scaleY(0.33)', offset: 0.63 },
          { transform: 'scaleY(0.33)', offset: 0.8 },
          { transform: 'scaleY(0)', opacity: 0 },
        ],
        { duration: 1000 },
      ),
      (async () => {
        await st.play(
          clover!,
          [{ transform: heroStart(st) }, { transform: bitAt(mouth, st.b, 0.7) }],
          { duration: 320, delay: 80, easing: 'ease-in-out' },
        )
        await st.play(
          clover!,
          [
            { transform: bitAt(mouth, st.b, 0.7), opacity: 1 },
            { transform: bitAt(mouth, st.b, 0.5, 10), opacity: 1, offset: 0.4 },
            { transform: bitAt(mouth, st.b, 0.3, -10), opacity: 1, offset: 0.75 },
            { transform: bitAt(mouth, st.b, 0.05), opacity: 0 },
          ],
          { duration: 560 },
        )
      })(),
      ...blades.slice(0, 3).map((blade, i) =>
        fly(
          st,
          blade,
          { x: cell.x + cell.w * (0.25 + i * 0.25), y: cell.y + cell.h * 0.8 },
          mouth,
          {
            duration: 260,
            delay: 260 + i * 240,
          },
        ),
      ),
    ])
    await straighten(st, 'rotate(-12deg)')
    return st.pos
  },

  // Picks the blueberries one after another and eats them; the bush gets smaller.
  bear: async (st) => {
    const { cell } = st
    const toward = -cell.side
    const mouth = mouthOf(st.pos, st.s, toward)
    st.piece.style.transformOrigin = `${cell.cx}px ${cell.y + cell.h}px`
    await lean(st, -8)
    const [berry, ...more] = st.bits
    await Promise.all([
      st.play(
        st.body,
        [
          { transform: 'rotate(-8deg)' },
          { transform: 'rotate(-8deg) scale(1.04, 0.96)', offset: 0.5 },
          { transform: 'rotate(-8deg)' },
        ],
        { duration: 300, iterations: 4 },
      ),
      st.play(
        st.piece,
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0.85, 0.7)', opacity: 0.8, offset: 0.6 },
          { transform: 'scale(0.6, 0.3)', opacity: 0 },
        ],
        { duration: 1100, delay: 150 },
      ),
      fly(st, berry!, st.hero, mouth, { duration: 380 }, st.hero.scale, st.hero.rot),
      ...more
        .slice(0, 3)
        .map((bit, i) =>
          fly(st, bit, spotIn(cell, i), mouth, { duration: 360, delay: 260 + i * 260 }, 0.55),
        ),
    ])
    await straighten(st, 'rotate(-8deg)')
    return st.pos
  },

  // Takes the leaves and munches them slowly; the branch shrinks from the side.
  koala: async (st) => {
    const { cell } = st
    const toward = -cell.side
    const mouth = mouthOf(st.pos, st.s, toward)
    // Munched from the koala's side: the piece shrinks towards the far edge.
    st.piece.style.transformOrigin = `${cell.cx + toward * cell.w * 0.5}px ${cell.cy}px`
    const [leaf, ...more] = st.bits
    show(leaf!, heroStart(st))
    await lean(st, -10)
    await Promise.all([
      chew(st, -10, 1100),
      st.play(
        st.piece,
        [
          { transform: 'scaleX(1)', opacity: 1 },
          { transform: 'scaleX(1)', offset: 0.2 },
          { transform: 'scaleX(0.7)', offset: 0.35 },
          { transform: 'scaleX(0.7)', offset: 0.5 },
          { transform: 'scaleX(0.4)', offset: 0.65 },
          { transform: 'scaleX(0.4)', offset: 0.8 },
          { transform: 'scaleX(0)', opacity: 0 },
        ],
        { duration: 1100 },
      ),
      (async () => {
        await st.play(
          leaf!,
          [{ transform: heroStart(st) }, { transform: bitAt(mouth, st.b, 0.8, -30) }],
          { duration: 320, delay: 80, easing: 'ease-in-out' },
        )
        await st.play(
          leaf!,
          [
            { transform: bitAt(mouth, st.b, 0.8, -30), opacity: 1 },
            { transform: bitAt(mouth, st.b, 0.55, -20), opacity: 1, offset: 0.35 },
            { transform: bitAt(mouth, st.b, 0.3, -35), opacity: 1, offset: 0.7 },
            { transform: bitAt(mouth, st.b, 0.05, -30), opacity: 0 },
          ],
          { duration: 700 },
        )
      })(),
      ...more
        .slice(0, 2)
        .map((bit, i) =>
          fly(
            st,
            bit,
            spotIn(cell, i + 1),
            mouth,
            { duration: 320, delay: 450 + i * 250 },
            0.6,
            60,
          ),
        ),
    ])
    await straighten(st, 'rotate(-10deg)')
    return st.pos
  },
}

/** For reduced motion: no hopping, the field just fades. */
export async function fadeClear(st: Stage) {
  show(st.bits[0]!, heroStart(st))
  await Promise.all([
    st.play(st.piece, [{ opacity: 1 }, { opacity: 0 }], { duration: 600 }),
    st.play(st.bits[0]!, [{ opacity: 1 }, { opacity: 0 }], { duration: 600 }),
  ])
}
