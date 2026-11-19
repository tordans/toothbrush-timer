# Photo styles: what each shortcut makes

Parents turn family photos into the weekly reward picture with an Apple Shortcut that uses Apple
Intelligence ("Bild erstellen", Image Playground). There is one everyday style and one themed
variant per occasion (see [occasions.md](occasions.md)). This document describes each style's
intention and what it adds, so the shortcuts, their prompts and the help text in the parents'
area all say the same thing.

**Check here before changing a shortcut prompt, and update it when a style changes.** The
animals have their own document, [animals.md](animals.md); this one is its counterpart for the
pictures.

## Shared rules for every style

- **Square.** Every picture is square (1:1), so the 8 × 7 photo grid covers it the same way
  every week.
- **The family stays recognisable.** The style changes the look, not who is in the picture.
  Faces stay friendly and open; nobody is turned into a different person or animal.
- **Calm and warm**, like the app's forest: soft light, friendly colours, no harsh contrast.
- **Nothing scary**, also not for Halloween: no blood, skulls, weapons, monsters with teeth,
  dark horror lighting. "Spooky" means cute.
- **No brands or known characters**: no film or toy characters, logos or lettering. A
  Weihnachtsmann is a generic one.
- **No text in the picture.** Children who cannot read yet get nothing from it, and generated
  letters are often garbled.
- **Themed additions are small extras.** The family photo stays the main subject; a theme adds
  things to find or wear, it does not replace the scene.

## Two kinds of themed additions

- **Hidden things to find ("Wimmelbild" extras).** Small objects placed around the scene for the
  child to discover while uncovering fields: eggs, Wichtel, little pumpkins. Good because the
  grid is uncovered field by field, so each field can reveal one.
- **Something to wear.** The child (or all children) wears a hat, ears or a small costume: a
  Zipfelmütze, bunny ears, a witch hat. The child recognises themselves at once. Adults may
  join, but the child comes first.

Each style below uses one or both.

## How a prompt is written

Every shortcut uses the Image Playground style **Illustration** and one prompt (the text in
"Bild erstellen"). Each prompt is a shared **base** (watercolour picture-book look, happy faces,
eyes looking ahead) followed by the style's hidden things and what is worn. **The exact prompts are
in [kurzbefehle.md](kurzbefehle.md)**, where the build script reads them; this document says what
each style is meant to show. The prompts were tried on 19 November 2026, macOS 27.2.1: first on
sample pictures (penguin and owl from `/Library/User Pictures`), then on one real family photo
with several people (kept outside git; results only shown to the owner).

What Image Playground accepts, learned from the tests:

- **No words for people.** "child wearing bunny ears" is refused ("Versuche es mit einer anderen
  Beschreibung"). Write only the thing: "bunny ears", "red santa hat". Image Playground puts it on
  a person in the photo by itself.
- **Nothing was refused on the family photo.** All seven styles went through on the first try,
  8 to 10 seconds each. Faces stayed recognisable and friendly in every style.
- **"on every head" decides who wears it.** With just "bunny ears" or "party hat", the item went
  to one or two people, often not the child. With "bunny ears on every head" (and the same for
  hats), everyone in the photo wore it, the child included. It is not a person word, so it is
  accepted.
- **"keep the original background" keeps the place.** Without it, several styles swapped the
  photo's background for a plain or invented one. With it, the real scene stayed and the extras
  were added on top.
- **Generated lettering can still appear** on walls or signs, garbled. No prompt tried so far
  prevents it; pick another run if it shows.
- **English, short phrases separated by commas** work; the longest prompt (Wichtel, about 40
  words) still went through.
- **Without the base,** the picture is flat and plain; with it, watercolour and warm light.
  "both eyes looking straight ahead" is kept because it stopped the squinting in family photos.
- **Numbers are loose.** "three little gnomes" gave five or six. Fine for a Wimmelbild.
- **"Hidden" is loose too.** Eggs and pumpkins tend to stand in a row along the bottom rather than
  being tucked away.
- Each picture takes 7 to 20 seconds and comes out 1024 × 1024.

## Everyday style

- **Intention:** a cheerful cartoon version of a real family moment.
- **Image Playground style:** Illustration (2D) or Animation (3D); one per family, kept the same
  across weeks.
- **Adds:** nothing.
- **Shortcut:** „Zahnputz-Bild Alltag“.

## Wichtel (Advent weeks)

- **Intention:** the Wichtel are visiting before Christmas. A little secret in every picture.
- **Hidden things:** 2–4 small Wichtel (gnomes with red pointed hats and white beards) peeking
  from behind furniture, plants or people; a tiny door at the bottom of a wall; a few small
  presents.
- **Wear:** none, so the Wichtel stay the surprise.
- **Mood:** cosy, warm light, fairy lights, a bit of fir green.
- **Shortcut:** „Zahnputz-Bild Wichtel“. Test: gnomes peek from both sides, door in the
  background, presents on the floor.

## Nikolaus (week of 6 December)

- **Intention:** the boots are filled tonight.
- **Hidden things:** a pair of boots with oranges, nuts and a chocolate figure; a few stars.
- **Wear:** the child wears a red Nikolaus hat with white trim.
- **Shortcut:** „Zahnputz-Bild Nikolaus“. Test: hat on the head, filled boots beside, stars.

## Weihnachten (week of 24 December)

- **Intention:** Christmas Eve is coming.
- **Hidden things:** baubles, small presents, a star, a few snowflakes outside the window.
- **Wear:** the child (or all children) wears a red Zipfelmütze; adults may wear one too.
- **Mood:** golden candle light, fir branches.
- **Shortcut:** „Zahnputz-Bild Weihnachten“. Note: the hat looks much like the Nikolaus hat.

## Silvester / Neujahr (week of 31 December)

- **Intention:** a cheerful farewell to the year.
- **Hidden things:** colourful streamers, confetti, a lucky clover, a little lucky pig.
- **Wear:** a paper party hat.
- **Not:** no loud fireworks or explosions in the scene; at most soft sparkles in the sky.
- **Shortcut:** „Zahnputz-Bild Silvester“. Test: party hat, clover and pig appear, no fireworks.

## Ostern (Easter week)

- **Intention:** the Easter bunny was here. An egg hunt inside the picture.
- **Hidden things:** 4–8 colourful painted eggs hidden around the scene, a small Easter bunny
  peeking out, spring flowers.
- **Wear:** the child wears bunny ears.
- **Shortcut:** „Zahnputz-Bild Ostern“. Test: ears and the peeking bunny work; the eggs line the
  bottom edge instead of being hidden.

## Halloween (week of 31 October)

- **Intention:** cute dressing-up fun, not fright.
- **Hidden things:** small friendly pumpkin lanterns, a smiling ghost made of a sheet, a little
  black cat, autumn leaves.
- **Wear:** the child wears a witch hat or cat ears.
- **Not:** see "Nothing scary" above. Pumpkins smile.
- **Shortcut:** „Zahnputz-Bild Halloween“. Test: smiling pumpkins and ghosts, nothing scary.

## Ideas for further occasions

From the list in [occasions.md](occasions.md), short so they can be built when wanted:

- **Zahnfee:** a tiny tooth fairy with a sparkling tooth, small stars; the child smiles with a gap.
- **Sankt Martin:** paper lanterns in the evening, warm glow; the child holds a lantern.
- **Fasching:** the child in a costume (lion, ladybird, pirate without weapons), confetti.
- **Geburtstag:** balloons, a cake with candles, a party hat on the birthday child only.
- **Erster Schnee:** snowflakes, a little snowman, the child in a woolly hat.

## How it reaches the shortcut

**One shortcut per style**, named „Zahnputz-Bild Alltag“, „Zahnputz-Bild Wichtel“ and so on.
Why, following [research/kurzbefehle-verteilen.md](research/kurzbefehle-verteilen.md): a shared
iCloud link is a snapshot, so a style menu would force every family to fetch everything again
whenever a theme is added. With one shortcut per style, a new occasion is just a new card in the
parents' area, and a mistake in one prompt touches only that style. Parents only install a
theme when its week comes, and the share menu shows clear names instead of an extra question.

How each shortcut is built, its exact prompt, where it saves and its iCloud link are in
[kurzbefehle.md](kurzbefehle.md).
