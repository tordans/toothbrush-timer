# The animals: profiles and personas

The child brushes with one of seven animals: Fuchs, Igel, Eule, Hase, Eichhörnchen, Bär and
Koala. Each has its own drawing, song, corner jingle, photo cover and way of clearing a field,
and more animal-specific things will follow.

This document is the shared basis for that work: drawings, objects, sounds, music and
animations. **Check here before designing anything animal-specific**, and **update it when
something new is decided** (a new object, a new sound, a changed colour). It describes what
exists today and extends it; where the code and the persona disagree, the point is listed under
[Open points](#open-points), not silently changed.

German terms are kept where the child sees or hears them (animal names, item names).

## Shared principles

### Tone

- Calm, warm, friendly forest. No pressure: no points, coins, streaks, unlocks or warnings that
  something is lost (see README, "What it does not do, on purpose").
- During brushing nothing appears except the timer, the current corner and the animal. A new
  animal-specific element must not add anything to the brushing screen beyond the animal itself.
- Every animal is a friend who brushes along, never a judge. It is never scary, sad, angry,
  disappointed or sick; nothing in the animal's look or sound reacts to a missed brushing.
- Each animal has one or two quirks a 3–7-year-old can see or hear at once. Quirks are shown,
  never explained in text.

### Shared sound rules

- All songs are generated live with the Web Audio API, no audio files.
- **C major only**, consonant harmony: chords from C, Am, F, G, Dm (`CHORDS` in `music.ts`), four
  bars per loop, two halves (A and B) that alternate every 32 eighths.
- **Walking tempo**: 152–200 eighths per minute (76–100 quarter notes per minute). Nothing faster.
- No drums in the usual sense, no hard attacks, no distortion, no sirens, no falling "fail"
  phrases, no minor-key sadness. Noise only as a whisper (shaker, breath, woodblock click).
- Melodies stay in about MIDI 64–84 (E4–C6); bass in octave 2–3, always soft (triangle or sine).
- The **corner jingle** is a short rising phrase (about 1–1.5 s) on the song's beat and in its
  instrument, ending on a C. It says "next corner" without breaking the song. Each animal has its
  own rhythm and its own last step into that C, because children recognise a tune before a timbre:
  owl B→C (half step), koala A→C (third), fox G→C (fourth), rabbit F→C (fifth), bear E→C (sixth),
  squirrel C→C' (octave), hedgehog C–C (the same note twice). A new animal takes an ending no one
  has.
- Jingles and bells play on their own sound bus: they also sound when the music is off. While a
  jingle plays, the music steps back to about 40 % and returns over half a second.
- Each loop's last bar is a G chord, so the loop returns home without a seam.
- Listen to every song and jingle on the dev server at `/sound-lab.html`.
- New sounds (tap, happy, sleepy) follow the same rules: under one second, in C major, the
  animal's own timbre, quieter than the song.

### Shared movement rules

- Gentle and readable: one clear action at a time, big enough to see on a phone, at least about
  150 ms per movement phase. Squash and stretch stays small (about 6–15 %).
- Easing `ease-in-out` or `ease-out`; no bounce overshoot beyond about 10 % (the `grow` and `pop`
  keyframes are the upper limit).
- A clear in about 1–1.5 s per field (`CLEAR` in `reveal-motion.ts`).
- **Reduced motion**: with `prefers-reduced-motion: reduce` CSS animations are cut to one short
  step (`index.css`), and on the photo the animal does not hop; the field simply fades
  (`fadeClear`). Every new animation needs such a still or fade fallback that keeps the meaning.
- Shared moves today: the animal bobs (3 s), waves while the corner changes (0.6 s), glides to
  the next corner (1.4 s ease-in-out), brushes with a wobbling toothbrush (0.5 s), hops on the
  "done" screen. These are the same for every animal.

### Shared drawing rules

- A **100×100 box**, the animal **sitting** with the feet near y 92–95 and the head **facing the
  viewer**; tails and the body's weight sit to the right, so the body reads as turned slightly
  left (the photo reveal mirrors it to look right).
- **Flat fills**, no outlines, no gradients; shading only as a second, lighter or darker fill of
  the same hue. Eyes in ink `#2b2118` with one white highlight; nose in ink.
- **Rosy cheeks** `#f19c8f` at 55 % opacity below the eyes, and a small curved smile.
- Light belly or muzzle patch on every animal; two oval feet in a darker shade.
- Must stay recognisable at **56 px** (the smallest size on the photo, `animalSize`): the
  silhouette (ears, tail, spines) has to carry the animal, not inner detail.
- Items are drawn in a **40×40 box** in the same flat style.

## Fuchs (fox)

**In one sentence:** the clever, cheeky tiptoer who sneaks up and then pounces.

**Character and quirks**

- Curious and quick-witted; always looks as if it has a little plan.
- A bit cheeky, but kind: it plays tricks, never on the child.
- Moves on tiptoe, then makes one surprising jump (the mouse pounce).
- Loves snow and winter mornings.

**Look**

- Palette: body `#e98a3e`, ears and tail `#e2762f`, inner ears and paws `#5b3523`, white mask,
  chest and tail tip `#fff6ea`.
- Shapes: big pointed ears with dark insides, a wide head with a white cheek mask meeting at the
  chin, a large tail curling up on the right with a white tip.
- At 56 px: the two tall triangle ears and the white mask. Keep them; they separate it from the
  squirrel, which shares the warm orange.

**Movement**

- General: light, springy hops; tiptoe steps with short pauses.
- Timing: quick setup (about 170 ms squash), then a long airy jump (about 480 ms).
- Signature gesture: the **mouse pounce** in the reveal: crouch, high arc, a head-first dive turning
  upside down into the snow, a little wiggle inside, a flip back out (about 1.5 s in all).
- Joy: a small hop on the spot with the tail swishing. Rest: curled with the tail around the paws.

**Sound and music**

- Today: "Fuchs", 192 eighths per minute, C – Am – Dm – G. A staccato walking bass (root, up, up,
  back), pizzicato stabs on the off-beats 3 and 7, a sly tune that enters after a rest on each
  bar. Jingle: a rest, two off-beat tiptoes E–G, a held breath, then a pounce up a fourth to C5,
  the loudest note of all jingles.
- Feel: tiptoe staccato, short notes with gaps, off-beat entries.
- Intervals: broken-chord steps (thirds), a jump of a fifth or octave for the pounce.
- Register: middle, tune around E4–E5; pounce up to G5.
- New sounds: tap = one pizzicato note; happy = three quick plucks up and a high one; sleepy = a
  soft pizzicato falling a fifth.

**Favourite things and objects**

- Item: **Schneeflocke** (snowflake, `#9cc8e6`). Cover: soft snow drifts on `#e6eff7` with glints.
- More: a little red scarf, mouse holes in the snow, tracks in fresh snow, a frosty pine twig,
  a moon on a winter evening.

**Do and don't**

- Do: sneak, pause, pounce. Clever looks, a wink.
- Don't: show it stealing, hunting or catching a mouse; the mouse is never seen.
- Don't: long legato phrases; the fox sounds like steps.

**Ideas for later**

- Tap sound: a tiny "tip" pizzicato; tracks appear in the snow where the child taps.
- The tail wraps around the fox while it rests in the forest at night.

## Igel (hedgehog)

**In one sentence:** the small, busy, cosy collector who rolls through the leaves.

**Character and quirks**

- Small, diligent, always pottering about.
- Cosy and a bit shy; feels safe curled up.
- Collects things on its spines without meaning to (leaves stick to them).
- Loves autumn and piles of leaves.

**Look**

- Palette: spines `#7a5638` and `#94704c`, face and body `#f1dcb6` and `#e9cfa4`, feet `#a07a55`.
- Shapes: a jagged crown of spines around a round light face; small round ears; eyes lower than
  any other animal (y 50), so the face sits low inside the spines.
- At 56 px: the zigzag silhouette. Never smooth the spines into a round blob. Spines stay soft:
  blunt-looking tips, never needle-sharp or threatening.

**Movement**

- General: short, quick trundling steps (today it hops like the others, see Open points).
- Timing: brisk, small steps; quick curls (about 180–200 ms).
- Signature gesture: **curl and roll**: it curls into a ball (scale 0.82), rolls twice through the
  field (850 ms), and the leaves stay stuck on its spines.
- Joy: a quick curl-and-uncurl, like a sneeze. Rest: curled into a ball, breathing.

**Sound and music**

- Today: "Igel", 188 eighths per minute (between owl and fox, slower than the squirrel),
  C – F – C – G. A soft woodblock tick-tack on every eighth (low 900 Hz, high 1300 Hz), a muted
  pluck playing a bouncy tune with repeated notes, a short bass that hops. Jingle: tick, plucks
  scurrying up in even eighths G–A–B–C, then the C again with a tack.
- Feel: busy, even eighths, small and dry.
- Intervals: repeated notes and small steps; thirds; a sixth at most.
- Register: middle-high (C5–C6), small instruments.
- New sounds: tap = a woodblock tick; happy = tick-tack plus two plucks up; sleepy = a slow
  tick... tack with a falling third.

**Favourite things and objects**

- Item: **Ahornblatt** (orange maple leaf, `#e07a2e`). Cover: bright autumn leaves in red, orange
  and yellow on `#c4642f`.
- More: an apple, a mushroom, a pile of leaves as a bed, a snail friend (calm, slow), acorns.

**Do and don't**

- Do: small, busy, cosy. Leaves on its back as a running joke.
- Don't: anything about spines hurting or pricking.
- Don't: long notes or big leaps.

**Ideas for later**

- The leaves it collects in a week stay on its spines in the forest until Monday.
- A tiny shuffling "rustle" sound when it moves to the next corner.

## Eule (owl)

**In one sentence:** the calm, wise night friend who watches with big eyes and blows the clouds
away.

**Character and quirks**

- Calm, gentle and thoughtful; the quietest listener.
- Awake in the evening; at home in the night sky.
- Turns its head and blinks slowly with big round eyes.
- Flies, while all others hop.

**Look**

- Palette: body `#9a7048`, head `#b5875a`, wings and ear tufts `#7d5a3c`, belly `#e7cfa6` with
  feather scallops `#b48d62`, beak and feet `#f2a93b`, big eyes `#fff8e6` with ink pupils.
- Shapes: a tall egg-shaped body, ear tufts, wings at the sides, a small triangle beak, the
  largest eyes of all animals (radius 9). No cheeks and no smile today (see Open points).
- At 56 px: the ear tufts and the two big pale eyes.

**Movement**

- General: flies in one arc instead of hops (450–900 ms), with slow flaps (about 220 ms each).
- Signature gesture: **hover and blow**: it hovers beside the field, flaps five times and blows the
  cloud away with a few streaks of wind (about 1.1 s).
- Joy: a wide wing spread and a slow head tilt. Rest: eyes half closed, feathers puffed.

**Sound and music**

- Today: "Spieluhr", 184 eighths per minute, C – Am – F – G. A fixed, singable music-box tune in
  A A B A with echo, a soft broken chord underneath, a slow bass. Jingle: E (held), G, B, then the
  half step up to C6 on the music box.
- Feel: even, legato, like a lullaby on a music box.
- Intervals: steps and thirds; the B part climbs to C6 and comes back down.
- Register: high and clear (E5–C6), with a soft bass.
- New sounds: tap = one music-box note with echo; happy = a short arpeggio with sparkle; sleepy =
  two soft notes "hoo-hoo", a falling third.

**Favourite things and objects**

- Item: **Wolke** (small night cloud `#c9cfe8` with a star `#ffd96b`). Cover: a night sky
  `#3b3f74` full of soft clouds and a few stars.
- More: the moon, stars, a lantern, a tree hollow, a feather.

**Do and don't**

- Do: calm, slow, wise; the evening animal.
- Don't: dark or spooky night; the night is always friendly and starry.
- Don't: staring that feels intense; keep the eyes soft with a highlight.

**Ideas for later**

- A slow blink in the forest every few seconds.
- In the evening, the lantern it lights glows a little warmer.

## Hase (rabbit)

**In one sentence:** the bright, bouncy hopper who skips everywhere and nibbles clover.

**Character and quirks**

- Cheerful and energetic, the most "skipping" of all.
- Quick to get excited, quick to listen: ears up at every sound.
- Nibbles all the time; twitches its nose.
- Loves meadows and lucky clover.

**Look**

- Palette: body `#d8cdc1`, ears `#cbbfb3` with pink insides `#f1b9b0`, muzzle, belly and tail
  `#f6f0e8`, nose `#e58b8b`, feet `#bfb2a5`.
- Shapes: two long upright ears, slightly splayed (±10°); a round head; a round fluffy tail at the
  right; a little pink triangle nose.
- At 56 px: the long ears. They must never be cropped or folded both down.

**Movement**

- General: hops, long-short like a skip (dotted rhythm).
- Timing: the standard hop (260 ms each, with squash and stretch).
- Signature gesture: **nibble down**: leans in and nibbles the grass in three bites while the field
  shrinks from the top, then eats the clover (about 1.3 s).
- Joy: a double hop with ears flopping. Rest: lying flat, ears laid back, nose twitching.

**Sound and music**

- Today: "Hase", 196 eighths per minute, C – G – F – G. A chirpy toy piano plays one skip per
  quarter (long, then short at 1.5 eighths), the bass "hops" with a small upward bend on root and
  fifth. Jingle: two skips up the scale (C–D, E–F, long-short), then a jump of a fifth to C6.
- Feel: swung, bouncy, dotted.
- Intervals: broken chords up and down, thirds and fourths; a jump of a fourth or fifth when
  excited.
- Register: high and bright (B4–C6).
- New sounds: tap = a single toy-piano note with a hop bend; happy = two skips upward; sleepy = a
  slow long-short falling third.

**Favourite things and objects**

- Item: **Kleeblatt** (four-leaf clover, `#6db34a`). Cover: a meadow `#68a142` with grass tufts and
  small clover.
- More: a carrot, dandelions, a rabbit hole in a hill, daisies, a puddle to jump over.

**Do and don't**

- Do: skip, twitch, nibble.
- Don't: nervous or fearful rabbit; ears up means curious, not alarmed.
- Don't: even, straight rhythms; it always skips.

**Ideas for later**

- Dandelion clocks that blow away when it hops past.
- Its ears twitch at the corner jingle.

## Eichhörnchen (squirrel)

**In one sentence:** the quick, curious scamperer who hoards nuts for later.

**Character and quirks**

- Curious, quick and a bit cheeky.
- Hoards things for later: tucks nuts into its cheeks.
- Can never sit still for long; scampers in quick little bursts.
- At home in trees; loves hazelnuts.

**Look**

- Palette: body `#c4633a`, tail and ears `#b5562b` with a lighter stripe `#cf7240`, belly and
  muzzle `#f5e3c8`, feet `#8e4322`.
- Shapes: a huge bushy tail curling high up behind on the right (up to y 30); small pointed ears
  with tufts; the body sits a bit left of centre (x 46) to make room for the tail.
- At 56 px: the tall S-shaped tail. It is darker and redder than the fox; keep that difference.

**Movement**

- General: scampers; the quickest, flattest hops (190 ms each, low, shorter steps).
- Signature gesture: **grab and nibble**: grabs the nut, nibbles it with crumbs falling, then tucks
  it into its cheeks (about 1.4 s).
- Joy: a fast tail flick and a spin. Rest: sitting upright holding a nut, tail over its back.

**Sound and music**

- Today: "Marimba", 200 eighths per minute (the fastest), C – G – Am – F, answered by
  Am – F – C – G in the second half. Bouncing marimba arpeggios on every eighth, a syncopated bass
  (beats 0, 3, 4), a whisper of shaker on the off-beats; in the second half, notes jump up an
  octave and a short tune appears. Jingle: a quick C–G, a pause, then C and the octave jump to C6.
- Feel: quick, light, a little syncopated.
- Intervals: broken-chord thirds, sudden octave jumps as its quirk.
- Register: middle to high (C4–C6), woody.
- New sounds: tap = a marimba knock; happy = a quick arpeggio up with an octave jump; sleepy =
  two soft marimba notes falling a fourth.

**Favourite things and objects**

- Item: **Haselnuss** (hazelnut, `#b8763a` with cap `#7a4e26`). Cover: brown forest floor
  `#a26b3b` with dry leaves.
- More: a pine cone, an acorn, a hollow full of hidden nuts, a tree branch, a beech nut.

**Do and don't**

- Do: quick, curious, hoarding.
- Don't: frantic or hectic; quick bursts with clear pauses.
- Don't: long legato or slow pads.

**Ideas for later**

- It "hides" a nut somewhere in the forest each week, and finds it again on Sunday.
- Puffed cheeks after clearing a field.

## Bär (bear)

**In one sentence:** the big, warm, steady friend who loves blueberries and the campfire.

**Character and quirks**

- Big, strong and gentle; the warmest hug.
- Steady and unhurried, but not sleepy.
- A bit greedy for berries and honey; eats with obvious delight.
- Likes campfire evenings and singing along.

**Look**

- Palette: body `#8a5a3b`, head `#9a6644`, muzzle `#e2bd98`, inner ears and belly `#c79772`, feet
  `#6f462d`.
- Shapes: round everything: round ears, a big round head, a wide body; the largest feet.
- At 56 px: the round ear circles on a broad round head.

**Movement**

- General: heavy, steady hops or a lumbering walk; weight shows in the squash.
- Timing: the standard hop, could be slower (see Open points); a slow chewing bob (300 ms).
- Signature gesture: **pick and munch**: picks the blueberries one by one with a happy bob while the
  bush shrinks (about 1.4 s).
- Joy: rubbing its tummy, a slow sway. Rest: sitting back, paws on its belly.

**Sound and music**

- Today: "Lagerfeuer", 176 eighths per minute, C – F – Am – G. Strummed ukulele (down, -, down,
  up, -, up, down, up), box-drum thumps on 1 and 3, a whistled tune of long notes every second
  time through. Jingle: a strum on G with a thump, one low pluck E4, then a long whistled C5 a
  sixth above it over a soft C strum.
- Feel: relaxed, warm strumming groove.
- Intervals: long notes from the chord, steps and thirds; no jumps beyond an octave.
- Register: middle and warm; the lowest bass and thump.
- New sounds: tap = a soft thump; happy = a strum and a whistled third; sleepy = a slow low strum.

**Favourite things and objects**

- Item: **Blaubeeren** (two blueberries `#3f4f9e` and `#4a5cb3` with a leaf). Cover: low
  blueberry bushes on `#3b6631`.
- More: a honey pot, a campfire with marshmallows (calm fire), a log to sit on, raspberries, a
  fishing stream.

**Do and don't**

- Do: big, warm, gentle, cosy.
- Don't: teeth, claws, roaring, standing up tall; never threatening.
- Don't: fast staccato; it is steady.

**Ideas for later**

- A small campfire glows next to it on evenings in the forest.
- A contented "mmm" hum (two soft notes) after clearing a field.

## Koala

**In one sentence:** the sleepy, content cuddler who is never in a hurry.

**Character and quirks**

- Sleepy and content; the slowest and softest.
- Never rushed; takes its time chewing.
- Loves holding on to things (branches, a pillow).
- A guest from far away who feels at home in the forest; munches eucalyptus.

**Look**

- Palette: ears and body `#9aa0a6`, head `#b4b9be`, inner ears `#f3eee6`, belly `#f1ece3`, chin
  `#dfe1e3`, big nose `#463b37` with a highlight `#6b605b`, feet `#5f646a`.
- Shapes: big round fluffy ears with tufts reaching out to the sides; a large dark oval nose (the
  biggest of all); a round grey head.
- At 56 px: the wide fluffy ears and the big dark nose. Keep it grey and cool, apart from the
  warm-brown animals.

**Movement**

- General: slow, swaying; it climbs and clings rather than hops.
- Timing: slow (the longest chew, 1.1 s), gentle sway, long ease-in-out.
- Signature gesture: **slow munch**: takes the leaves and munches them slowly while the branch
  shrinks from its side (about 1.5 s).
- Joy: a slow, wide sway and closed happy eyes. Rest: dozing, head on its paws.

**Sound and music**

- Today: "Koala", 152 eighths per minute (the slowest), F – C – Am – G. A warm, slowly breathing
  pad, a bass rocking in a lazy 3 + 3 + 2, a breathy flute singing a slow lullaby of three notes per
  bar. Jingle: a soft chord swells while the flute lazily climbs G–A, then a third up to a long C5.
- Feel: lazy rocking, long notes, the 3 + 3 + 2 sway.
- Intervals: steps, thirds and an occasional falling fourth; slow downward contours.
- Register: middle (E4–F5), soft and breathy.
- New sounds: tap = a soft flute note; happy = a slow rising third with pad; sleepy = a falling
  third with a breath (a yawn).

**Favourite things and objects**

- Item: **Eukalyptusblatt** (blue-green eucalyptus leaf, `#7fae96`). Cover: long eucalyptus
  leaves with twigs on `#759c89`.
- More: a cosy branch fork, a small pillow, a sleeping cap, gum nuts, a hammock.

**Do and don't**

- Do: slow, soft, sleepy, cuddly.
- Don't: never rushed; no fast staccato or quick hops.
- Don't: show it so sleepy that it seems not to brush; it is content, not bored.

**Ideas for later**

- It hugs the toothbrush handle with both paws.
- A yawn as its sleepy sound at the end of an evening brushing.

## Contrast table

| Animal       | Tempo (eighths/min) | Main instrument    | Movement verb | Signature colour | Item            | Energy |
| ------------ | ------------------- | ------------------ | ------------- | ---------------- | --------------- | ------ |
| Fuchs        | 192                 | Pizzicato strings  | sneak, pounce | `#e98a3e`        | Schneeflocke    | high   |
| Igel         | 188                 | Woodblock, pluck   | trundle, roll | `#7a5638`        | Ahornblatt      | medium |
| Eule         | 184                 | Music box          | glide, flap   | `#9a7048`        | Wolke           | low    |
| Hase         | 196                 | Toy piano          | skip, hop     | `#d8cdc1`        | Kleeblatt       | high   |
| Eichhörnchen | 200                 | Marimba            | scamper       | `#c4633a`        | Haselnuss       | high   |
| Bär          | 176                 | Ukulele, whistle   | lumber        | `#9a6644`        | Blaubeeren      | medium |
| Koala        | 152                 | Breathy flute, pad | sway, cling   | `#b4b9be`        | Eukalyptusblatt | low    |

Keep the pairs that are close apart: Fuchs and Eichhörnchen (orange, big tail, high energy),
Hase and Koala (pale grey), Igel and Bär (brown), Eule and Koala (calm). A new element should
widen these differences, not narrow them.

## Where it lives in the code

| Aspect                                 | File                                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| Animal ids                             | `src/features/family/schema.ts`                            |
| German names, drawings, eyes, cheeks   | `src/features/forest/Animal.tsx`                           |
| Songs, instruments, jingles            | `src/features/timer/music.ts` (`SONGS`)                    |
| Audio playback                         | `src/features/timer/audio.ts`                              |
| Items (40×40)                          | `src/features/photos/animal-items.tsx`                     |
| Photo cover texture per animal         | `src/features/photos/PhotoCover.tsx` (`COVER_STYLE`)       |
| Hopping, flying and clearing motions   | `src/features/photos/reveal-motion.ts` (`travel`, `CLEAR`) |
| Reveal sequence, flying bits           | `src/features/photos/RevealAnimal.tsx` (`EXTRA_BIT`)       |
| Thought bubble with the item           | `src/features/photos/ThoughtBubble.tsx`                    |
| Shared CSS animations (bob, wave, hop) | `tailwind.config.ts`, `src/index.css`                      |
| Brushing screen, done screen           | `src/pages/BrushPage.tsx`                                  |
| Forest week                            | `src/features/forest/ForestWeek.tsx`                       |

## Open points

- **Owl has no cheeks and no smile.** `Eyes` skips the cheeks for the owl, and its art has no
  `Smile`, against the shared drawing rule. Decide whether the beak counts as its smile or add
  soft cheeks below the big eyes.
- **"Facing the viewer" vs "facing left".** The faces look at the viewer, but `reveal-motion.ts`
  treats the drawings as facing left (tails on the right). Both are true; new drawings must keep
  the tail on the right so mirroring works.
- **Hedgehog hops.** In `travel` the hedgehog hops like the others; its persona trundles. A low,
  quick scurry (like the squirrel's, but flatter) would fit better.
- **Bear and koala hop at the standard speed.** Only the squirrel (quicker) and the owl (flying)
  travel differently. A slower, heavier hop for the bear and a slow climb-like move for the koala
  would match their songs.
- **Brushing moves are the same for all animals.** Bob, wave, corner glide and the done-screen hop
  do not express any persona yet.
- **Song names don't match animals.** Three songs are named by style (`spieluhr` for the owl,
  `marimbaSong` for the squirrel, `lagerfeuer` for the bear), the rest by animal.
- **Item names are not shown as text.** The German item names here are working names; the app
  shows only the drawings.
- **Koala in a European forest.** Eucalyptus and a koala are not native to the forest; fine for a
  child, but keep it framed as a welcome guest, not a mistake.
