# Shortcuts: the source of truth

The Apple Shortcuts that turn a family photo into a reward picture. This file is the source of
truth: every shortcut's purpose, actions, prompt and iCloud link live here, and
[`scripts/kurzbefehle/build.py`](../scripts/kurzbefehle/build.py) builds the shortcut files from the
table below. What each style is meant to show is in [photo-styles.md](photo-styles.md); the texts
for parents are in [kurzbefehle-eltern.md](kurzbefehle-eltern.md); why one shortcut per style and
why iCloud links is in [research/kurzbefehle-verteilen.md](research/kurzbefehle-verteilen.md).

## The shortcuts

All prompts start with the same base:

<!-- build:base -->

`joyful children's picture book illustration, ink lines and soft watercolor, big happy smiles, both eyes looking straight ahead, keep the original background`

<!-- build:rows -->

| Name                      | Folder      | Prompt after the base                                                                                                                         | iCloud link                                                       |
| ------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Zahnputz-Bild Alltag      | Alltag      | `bright cheerful colors, friendly round shapes, little stars and sparkles around`                                                             | https://www.icloud.com/shortcuts/96e44c0937b74414af04777abe759174 |
| Zahnputz-Bild Wichtel     | Wichtel     | `three little gnomes with red pointed hats peeking out from hiding places, tiny door in the wall, small presents, fairy lights, fir branches` | https://www.icloud.com/shortcuts/5e9e18f5fd254da992d7b60cf0701bdc |
| Zahnputz-Bild Nikolaus    | Nikolaus    | `red santa hats with white trim on every head, boots filled with oranges, nuts and chocolate, little golden stars`                            | https://www.icloud.com/shortcuts/df7ddb2ecd454189aa175f6f2bd58434 |
| Zahnputz-Bild Weihnachten | Weihnachten | `red pointed christmas hats on every head, christmas baubles, small presents, warm candle light, fir branches, snowflakes`                    | https://www.icloud.com/shortcuts/63642e4e828c4463b3d30fac08f62a92 |
| Zahnputz-Bild Silvester   | Silvester   | `colorful paper party hats on every head, streamers and confetti, four-leaf clover, little pink lucky pig, soft sparkles`                     | https://www.icloud.com/shortcuts/c98e46ac2e2240e7a9c85ce579689caf |
| Zahnputz-Bild Ostern      | Ostern      | `bunny ears on every head, small colorful easter eggs hidden all around the scene, little bunny peeking out, spring flowers`                  | https://www.icloud.com/shortcuts/d6a935c3ea7340f7bde7f5cdf3bef9e9 |
| Zahnputz-Bild Halloween   | Halloween   | `purple witch hats on every head, small smiling pumpkin lanterns, friendly little sheet ghost, small black cat, autumn leaves`                | https://www.icloud.com/shortcuts/56e339f1205f4fab8d46a37a229fffde |

<!-- build:end -->

"–" means not shared yet. Links were made on 19 November 2026 from the shortcuts built by the script. The same links are in
`src/features/photos/shortcuts.ts` for the parents' area; change both together.

## What every shortcut does

The same four actions, only name, folder and prompt differ. To rebuild one by hand in the
Kurzbefehle app:

1. **Details → „Im Share Sheet zeigen“** on, input: Bilder (and Dateien). On the Mac also
   „Als Schnellaktion verwenden“.
2. **„Mit jedem Objekt aus Kurzbefehleingabe wiederholen“** (Repeat with each), so several photos
   can be shared at once.
3. Inside the repeat: **„Bild erstellen“** (Image Playground): Beschreibung = base + the row's
   prompt, Bild = „Wiederholungsobjekt“, Stil = **Illustration**, „In Playground sichern“ = **Nie**.
4. Inside the repeat: **„Datei sichern“** with these settings:
   - Ordner: **leave empty** (= iCloud Drive → Kurzbefehle). A folder picked here (for example
     „Downloads“) is a link into the builder's own iCloud Drive and does not survive sharing.
   - **„Nach Speicherort fragen“: off.**
   - **Unterpfad:** `Zahnputz-Fotos/<Folder>/<date> <Folder>.png`, where `<date>` is the variable
     „Aktuelles Datum“ with format **Eigene: `yyyy-MM-dd HH-mm-ss`**. Example:
     `Zahnputz-Fotos/Ostern/2026-11-19 07-14-39 Ostern.png`. Missing folders are created.
   - **„Überschreiben, falls Datei existiert“: off.**

Result: `iCloud Drive/Kurzbefehle/Zahnputz-Fotos/<Folder>/`, one file per photo, never overwritten.
In the Mac Finder this folder is not under iCloud Drive's root but in the „Kurzbefehle“ folder.
A shortcut cannot save to the root of iCloud Drive without a picked folder, and a picked folder
does not travel with a shared link; so the Kurzbefehle folder is the only place that works for
every family.

### Why pictures were overwritten before

The image from „Bild erstellen“ is always called „Bild“. When the save goes to a fixed name (a
subpath like `Zahnputz-Fotos/Bild.png`, or a constant name with „Überschreiben“ on), every run hits
the same file and replaces it. With the date and time down to the second in the name and
„Überschreiben“ off, every picture gets its own file. Tested on 19 November 2026: two runs in a row
and one run with two photos gave four separate files. Without a custom format the date variable
only has minutes (`19.11.2026, 07:11`), which is not enough.

## Building and installing (Mac)

```sh
python3 scripts/kurzbefehle/build.py ~/Desktop/kurzbefehle
```

This writes one signed `.shortcut` file per row into that folder (keep it outside the repo) (needs a Mac signed in to iCloud;
`shortcuts sign` sends a copy to Apple). Double-click a file to add it. If a shortcut with the
same name exists, „Ersetzen“ keeps the old one renamed to „… 2“; delete that by hand.

## Sharing (owner only)

1. In the Kurzbefehle app open the shortcut → Teilen → „iCloud-Link kopieren“.
2. Put the link in the table above and in `src/features/photos/shortcuts.ts`, then commit.
3. After any change to a shortcut, share again and replace the link: a link is a snapshot, and
   families who have the old version keep it until they fetch the new one.

The link is public and Apple keeps a copy, so a shortcut never contains names, keys or a picked
folder.

## Open

- Not yet tested on the iPad and with family photos.
- Whether Image Playground runs on the device or on Apple's servers (see
  [kurzbefehle-eltern.md](kurzbefehle-eltern.md), privacy sentence).
- Direct upload to the API is not part of version 1 (see the research document for what works).
