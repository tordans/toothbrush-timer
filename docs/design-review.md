# Design review, November 2026

A review of all screens at iPad (820×1180, 1024×768) and iPhone (390×844) sizes, in morning and
evening light, against the tone in [animals.md](animals.md) and the README: calm, warm forest, no
pressure. Small fixes were made directly (commit "Readable week switch and steadier calendar
rows"). This file lists the larger ideas that change a layout or how a child uses a screen; none of
them are built.

The photo reveal (`/foto` with a real photo) was not seen live: the local API needs Docker, which
was not running. Only its empty state was checked.

Ranked by value. Effort: S = an hour or two, M = half a day to a day, L = more.

## 1. Brushing on a tablet: small type, empty lower third

- **Screen:** brushing, before, during and after (`BrushPage.tsx`), iPad portrait.
- **Problem:** the dial grows with the screen but the text does not: "Ben · Abends", the
  introduction and the remaining time stay phone-sized, and the bottom third of the screen is
  empty. In landscape this is fine.
- **Proposal:** centre the dial and text block vertically as one group, and step the type up at
  `md` (title 5xl → 6xl, time 2xl → 3xl, intro text lg). Keep the dial capped so the animal in the
  corner stays on screen.
- **Effort:** S.

## 2. "Fertig": the reward moment is small

- **Screen:** brushing, done (`BrushPage.tsx`).
- **Problem:** the end of brushing is the one moment the child waits for, but it is a small lantern
  in a circle next to the animal, with text below. The lantern lighting up happens back in the
  forest only if the child goes there.
- **Proposal:** one orchestrated moment: the clearing of today (flower or lantern, the same drawing
  as in the forest) grows in large, lights up once, the animal hops next to it. No stars, no
  counting, nothing more than the forest already shows. Needs a still fallback for reduced motion.
- **Effort:** M.

## 3. Calendar on a tablet: a small card in a dark field

- **Screen:** calendar (`OverviewPage.tsx`), iPad landscape.
- **Problem:** the month is a 576 px card in the middle of a 1024 px dark green screen; the day
  icons stay small.
- **Proposal:** at `lg`, show two months side by side (this and last), or let the card grow to
  `max-w-3xl` with larger day cells. Optional: the forest sky as a narrow band at the top, so the
  calendar feels part of the same place.
- **Effort:** M.

## 4. Start screen: the forest is missing

- **Screen:** start (`StartScreen.tsx`).
- **Problem:** the first thing a family sees is a cream form on flat dark green. The most
  characteristic thing of the app, the illustrated forest with the animal, appears only after the
  invite word.
- **Proposal:** put the morning forest (without the path) behind the card, dimmed, with the fox
  sitting at the card's edge. No new copy.
- **Effort:** M.

## 5. Parents' area: layout ideas for the tab split

For the main session's split into "Putzen" and "Fotos"; not touched here.

- **Correcting days:** 14 rows of two buttons dominate the page. Show this week and last week as
  two short blocks with the week as heading, newest first, so a parent finds a day by its week.
- **Text sizes:** explanations are `text-sm` in a light brown, the "Über" section is `text-base`.
  Pick one size for explanations (base on iPad, sm on phone) and darken it one step (`bark-700`)
  for contrast on cream.
- **Buttons:** "Fotos hochladen" is `lg`, "Link kopieren" `md`, "+ Kind hinzufügen" a full-width
  secondary. One size per role: main action of a section `md` primary, adding a row full-width
  secondary.
- **Signing out:** "Auf diesem Gerät abmelden" is a filled red button as heavy as everything else.
  A quieter outline or text button, with the confirmation it already has, fits the calm tone better.
- **Effort:** M, together with the split.

## 6. Parents' question: heading in small capitals

- **Screen:** parent gate (`ParentGateDialog.tsx`).
- **Problem:** "NUR FÜR ELTERN" is a small, tracked, all-caps label; the question below carries the
  real weight. The rest of the app uses sentence case headings.
- **Proposal:** "Nur für Eltern" as a normal `text-2xl` heading like the other dialogs. Left alone
  here because the main session changed this dialog recently.
- **Effort:** S.

## Not proposed, on purpose

- **A pill for the active child in the forest.** The app's rule: what is only shown is plain text,
  what can be tapped is a pill or a pill button. The active child's name is a label, so it stays
  text; the other children are buttons, so they are pills. The same rule applies to the week label
  next to the arrows.
- **A new typeface.** Nunito's round shapes match the drawings and read well for parents on phones;
  a "distinctive" display face would fight the illustrations.
- **More motion or decoration on the forest.** The forest already carries the personality; the
  bars and buttons around it should stay quiet.
