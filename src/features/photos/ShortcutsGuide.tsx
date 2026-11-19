import type { ReactNode } from 'react'
import { SHORTCUTS } from './shortcuts'

/**
 * How parents make reward pictures with Apple Intelligence: what they need, how to add a
 * shortcut, how to make a picture. Texts from docs/kurzbefehle-eltern.md.
 */
export function ShortcutsGuide() {
  return (
    <>
      <p className="text-sm text-bark-700">
        Ein Kurzbefehl von Apple macht aus einem Familienfoto ein fröhliches, gemaltes Bild. Das
        erledigt Apple Intelligence. Ihr braucht dafür ein iPhone 15 Pro oder neuer, ein iPad mit
        M1-Chip oder neuer (oder iPad mini mit A17 Pro) oder einen Mac mit Apple-Chip, und Apple
        Intelligence muss eingeschaltet sein (Einstellungen → Apple Intelligence & Siri).
      </p>

      <Steps title="Kurzbefehl hinzufügen">
        <li>Tippt unten bei einem Stil auf „Kurzbefehl holen“.</li>
        <li>Die Kurzbefehle-App öffnet sich. Tippt auf „Kurzbefehl hinzufügen“.</li>
        <li>Mit iCloud ist er bald auch auf euren anderen Geräten.</li>
      </Steps>

      <Steps title="Ein Bild machen">
        <li>Öffnet die Fotos-App und wählt ein Foto aus.</li>
        <li>Tippt auf Teilen und wählt den Kurzbefehl, zum Beispiel „Zahnputz-Bild Alltag“.</li>
        <li>Beim ersten Mal fragt das Gerät nach Erlaubnis. Tippt auf „Erlauben“.</li>
        <li>
          Nach 10 bis 30 Sekunden liegt das Bild in der App Dateien unter iCloud Drive → Kurzbefehle
          → Zahnputz-Fotos, in einem Ordner je Stil.
        </li>
        <li>Ladet es oben unter „Belohnungsfotos“ hoch und wählt, für welche Woche es ist.</li>
      </Steps>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SHORTCUTS.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 rounded-2xl bg-white p-4">
            <span className="font-extrabold">{s.name}</span>
            <span className="text-sm text-bark-700">{s.text}</span>
            {s.link ? (
              <a
                href={s.link}
                target="_blank"
                rel="noreferrer"
                className="mt-auto inline-flex min-h-11 cursor-pointer select-none items-center justify-center self-start rounded-full bg-sun px-5 py-2 font-extrabold text-bark-900 shadow-[0_3px_0_#c9962a] active:scale-95"
              >
                Kurzbefehl holen
              </a>
            ) : (
              <span className="mt-auto text-sm font-bold text-bark-500">Link folgt bald</span>
            )}
          </li>
        ))}
      </ul>

      <details className="rounded-2xl bg-white px-4 py-3 text-sm text-bark-700">
        <summary className="min-h-11 cursor-pointer select-none content-center font-extrabold text-bark-900">
          Wenn es nicht klappt
        </summary>
        <ul className="mt-2 flex list-disc flex-col gap-2 pl-5">
          <li>
            Der Kurzbefehl fehlt beim Teilen: ganz nach unten scrollen. Fehlt er weiter, die
            Fotos-App einmal schließen und neu öffnen.
          </li>
          <li>„Versuche es mit einer anderen Beschreibung“: Probiert ein anderes Foto.</li>
          <li>
            Es passiert nichts: Liegt das Foto nur in iCloud, öffnet es einmal groß und wartet, bis
            es scharf ist.
          </li>
          <li>
            Gefällt euch ein Bild nicht, startet den Kurzbefehl noch einmal. Jedes Mal entsteht ein
            anderes Bild.
          </li>
          <li>Ohne Apple Intelligence könnt ihr Fotos trotzdem direkt hochladen.</li>
        </ul>
      </details>

      <p className="text-sm text-bark-600">
        Das Bild entsteht mit Apple Intelligence. Wir sehen eure Fotos erst, wenn ihr ein Bild hier
        hochladet.
      </p>
    </>
  )
}

function Steps({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-extrabold">{title}</h3>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-bark-700">{children}</ol>
    </div>
  )
}
