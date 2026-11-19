# Occasions: special photos for special weeks

Some weeks of the year belong to an occasion: Advent, Christmas, Easter, Halloween and so on.
For these weeks, parents can prepare a photo in a matching style (see
[photo-styles.md](photo-styles.md)) and mark it for the occasion. When the week comes, the app
shows that photo instead of the next one in line.

This document lists the occasions, how their week is found, and how the app should choose the
photo. German names are kept where parents see them.

## The rule for "the week of"

A week runs from Monday to Sunday, as everywhere in the app (`weekKey` in `src/lib/dates.ts`).
The week of an occasion is the week that contains its day. If that day is a Sunday, the week
before Sunday is the week of the occasion (Easter Sunday ends Holy Week, so the eggs are hidden
at the end of the Easter photo's week).

## Occasions to start with

These are the ones the owner asked for. Dates are calculated, never typed in per year.

| Occasion (German)     | Day                               | 2026 week | 2027 week | Style       |
| --------------------- | --------------------------------- | --------- | --------- | ----------- |
| Adventszeit (Wichtel) | every week that contains 1–23 Dec | see below | see below | Wichtel     |
| Nikolaus              | 6 December                        | 30 Nov    | 6 Dec     | Nikolaus    |
| Weihnachten           | 24 December                       | 21 Dec    | 20 Dec    | Weihnachten |
| Silvester / Neujahr   | 31 December                       | 28 Dec    | 27 Dec    | Silvester   |
| Ostern                | Easter Sunday (calculated)        | 30 Mar    | 22 Mar    | Ostern      |
| Halloween             | 31 October                        | 26 Oct    | 25 Oct    | Halloween   |

**Advent.** The Advent weeks are the weeks that contain a day of the Advent calendar (1 to 23
December). In 2026 these are the weeks of 30 Nov, 7 Dec and 14 Dec. The week of 30 Nov is also
Nikolaus week; a more specific occasion always wins (see [Priority](#priority)), so in 2026 the
Wichtel appear in two weeks: 7 Dec and 14 Dec. In 2027 Nikolaus is on a Monday, so the weeks are
29 Nov (Wichtel), 6 Dec (Nikolaus) and 13 Dec (Wichtel).

**Timing note for 2026:** the first Advent week starts on Monday 30 November. Photos for it must
be uploaded and marked before then.

## More occasions worth considering

Ordered by how well they fit a toothbrushing app for 3- to 7-year-olds. Each would be a built-in
occasion that families can switch off.

| Occasion (German)            | Day                                        | Why it fits                                                                                    |
| ---------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Zahnfee / Wackelzahn**     | own date (the week a milk tooth falls out) | The most fitting of all: teeth are the app's subject. A parent marks the week when it happens. |
| **Tag der Zahngesundheit**   | 25 September                               | Germany's day of dental health; a sparkling-teeth theme.                                       |
| **Sankt Martin**             | 11 November                                | Lantern walks in every Kita. The evening screen already has a lantern.                         |
| **Fasching / Karneval**      | Rosenmontag (Easter Sunday − 48 days)      | Children dress up; the photo shows the child in costume. 2027: week of 8 Feb.                  |
| **Geburtstag**               | own date per child                         | Party hat, balloons, cake. One per child.                                                      |
| **Einschulung / Kita-Start** | own date                                   | Schultüte. Once in a lifetime, so an own date.                                                 |
| **Erster Schnee**            | own date (marked when it happens)          | Snow cannot be calculated; a parent marks the week.                                            |
| **Frühlingsanfang**          | 20 March                                   | Flowers, first butterflies. Often close to Easter; Easter wins.                                |
| **Sommerferien**             | own date (start of the holidays)           | Holidays differ per German state, so an own date. Beach, ice cream.                            |
| **Muttertag / Vatertag**     | 2nd Sunday of May / Ascension Day          | Fits a family photo, but optional: not every family celebrates it.                             |
| **Pfingsten**                | Easter Sunday + 49 days                    | Low recognition among small children; listed for completeness.                                 |
| **Erntedank / Herbst**       | 1st Sunday of October                      | Leaves, pumpkins, apples. Sits close to Halloween; one of the two is enough.                   |

Not recommended: Valentinstag (not a children's occasion), religious days beyond Christmas and
Easter (families differ), anything with scary or violent themes.

## Own occasions

Parents can add their own dates (birthday, first day of school, a tooth that fell out, a trip to
grandma). An own occasion has a name, a date and optionally a repeat every year. It counts like a
built-in one and wins over all built-in ones in its week.

## How a photo is chosen

Today the current week takes the oldest unused photo until its first field is uncovered
(`photoForWeek` in `src/features/photos/rewards.ts`). With occasions:

1. **An occasion photo for this week wins.** If an unused photo is marked for an occasion of this
   week, the week takes it (the oldest, if there are several).
2. **Occasion photos wait for their week.** The normal order skips photos marked for an occasion,
   so a Christmas photo is never used up in October.
3. **Without an occasion photo, the week goes on as usual.** An occasion never leaves a week
   without a photo.
4. **Once chosen, it stays.** As today, the choice is stored when the first field is uncovered.

### Priority

When several occasions fall into one week: own occasion > Nikolaus, Weihnachten, Silvester,
Ostern, Halloween and other day-based occasions > Adventszeit (Wichtel) > seasons (Frühlingsanfang,
Herbst).

### Hint for parents

The "!" on the parents' gear already warns a week ahead when no photo is left. It should also
warn a week ahead when an occasion is coming and no photo is marked for it: "Nächste Woche ist
Nikolaus. Möchtest du ein Nikolaus-Foto vorbereiten?" The warning only asks; the week still works
without one.

## Data

- A photo gets an optional `occasion` field: the id of a built-in occasion (`advent`, `nikolaus`,
  `christmas`, `new-year`, `easter`, `halloween`, …) or of an own occasion. It belongs to the photo
  record on the server, where the photo list lives.
- Own occasions live in the family state, with `updatedAt` and tombstones like every other record.
- Built-in occasions are code: an id, a German name and a function from year to date.
- Which built-in occasions a family uses is a setting in the family state (all on by default for
  the six starting ones, off for the rest).

## Open questions

- An occasion photo that was not used (the week passed without brushing): does it wait for next
  year, or join the normal order? Proposal: it joins the normal order after its week.
- Can one photo be marked for several occasions? Proposal: no, one occasion per photo keeps the
  choice simple.
- Should a past year's occasion photo come back the next year? Proposal: no, each year gets new
  photos; the old ones stay visible in their week.
