import type { OccasionId } from './occasions'

/**
 * The Apple Shortcuts that turn a family photo into a reward picture, one per style (see
 * docs/photo-styles.md and docs/kurzbefehle-eltern.md). The repo is the source of truth: the
 * style, prompt and steps of each shortcut are described there, and its iCloud link is kept here.
 * A link is public (anyone with it can read the shortcut, Apple keeps a copy), so the shortcuts
 * hold no names and no keys. `link: null` shows "Link folgt" until the shortcut is shared.
 */
export const SHORTCUTS: {
  id: 'everyday' | OccasionId
  name: string
  text: string
  link: string | null
}[] = [
  {
    id: 'everyday',
    name: 'Zahnputz-Bild Alltag',
    text: 'Ein fröhliches gemaltes Bild von eurem Foto. Für jede Woche.',
    link: null,
  },
  {
    id: 'advent',
    name: 'Zahnputz-Bild Wichtel',
    text: 'Kleine Wichtel verstecken sich im Bild. Für die Adventswochen.',
    link: null,
  },
  {
    id: 'nikolaus',
    name: 'Zahnputz-Bild Nikolaus',
    text: 'Nikolausmütze und gefüllte Stiefel. Für die Nikolauswoche.',
    link: null,
  },
  {
    id: 'christmas',
    name: 'Zahnputz-Bild Weihnachten',
    text: 'Zipfelmütze, Kugeln und Kerzenlicht. Für die Weihnachtswoche.',
    link: null,
  },
  {
    id: 'new-year',
    name: 'Zahnputz-Bild Silvester',
    text: 'Partyhut, Konfetti und ein Glücksschwein. Für die Silvesterwoche.',
    link: null,
  },
  {
    id: 'easter',
    name: 'Zahnputz-Bild Ostern',
    text: 'Hasenohren und bunte Eier. Für die Osterwoche.',
    link: null,
  },
  {
    id: 'halloween',
    name: 'Zahnputz-Bild Halloween',
    text: 'Hexenhut, lachende Kürbisse und kleine Gespenster. Nichts Gruseliges.',
    link: null,
  },
]
