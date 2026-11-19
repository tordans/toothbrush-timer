import type { OccasionId } from './occasions'

/**
 * The Apple Shortcuts that turn a family photo into a reward picture, one per style (see
 * docs/photo-styles.md and docs/kurzbefehle-eltern.md). The repo is the source of truth: the
 * style, prompt and steps of each shortcut are described there. The links are listed in
 * docs/kurzbefehle.md first and mirrored here.
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
    link: 'https://www.icloud.com/shortcuts/96e44c0937b74414af04777abe759174',
  },
  {
    id: 'advent',
    name: 'Zahnputz-Bild Wichtel',
    text: 'Kleine Wichtel verstecken sich im Bild. Für die Adventswochen.',
    link: 'https://www.icloud.com/shortcuts/5e9e18f5fd254da992d7b60cf0701bdc',
  },
  {
    id: 'nikolaus',
    name: 'Zahnputz-Bild Nikolaus',
    text: 'Nikolausmütze und gefüllte Stiefel. Für die Nikolauswoche.',
    link: 'https://www.icloud.com/shortcuts/df7ddb2ecd454189aa175f6f2bd58434',
  },
  {
    id: 'christmas',
    name: 'Zahnputz-Bild Weihnachten',
    text: 'Zipfelmütze, Kugeln und Kerzenlicht. Für die Weihnachtswoche.',
    link: 'https://www.icloud.com/shortcuts/63642e4e828c4463b3d30fac08f62a92',
  },
  {
    id: 'new-year',
    name: 'Zahnputz-Bild Silvester',
    text: 'Partyhut, Konfetti und ein Glücksschwein. Für die Silvesterwoche.',
    link: 'https://www.icloud.com/shortcuts/c98e46ac2e2240e7a9c85ce579689caf',
  },
  {
    id: 'easter',
    name: 'Zahnputz-Bild Ostern',
    text: 'Hasenohren und bunte Eier. Für die Osterwoche.',
    link: 'https://www.icloud.com/shortcuts/d6a935c3ea7340f7bde7f5cdf3bef9e9',
  },
  {
    id: 'halloween',
    name: 'Zahnputz-Bild Halloween',
    text: 'Hexenhut, lachende Kürbisse und kleine Gespenster. Nichts Gruseliges.',
    link: 'https://www.icloud.com/shortcuts/56e339f1205f4fab8d46a37a229fffde',
  },
]
