import { useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ChevronLeft } from '@/components/icons'
import { Button, Card } from '@/components/ui'

const FULL_TEXT_URL = 'https://github.com/tordans/toothbrush-timer/blob/main/docs/datenschutz.md'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-bold text-moss-700 underline">
      {children}
    </a>
  )
}

/** Short version of docs/datenschutz.md. Keep both in step. */
export function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <main className="h-full select-text overflow-y-auto bg-moss-800 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-16">
        <Button variant="ghost" className="self-start" onClick={() => void navigate({ to: '/' })}>
          <ChevronLeft className="h-5 w-5" />
          Zurück
        </Button>
        <Card className="flex flex-col gap-5 text-bark-800">
          <h1 className="text-2xl font-extrabold text-bark-900">Datenschutz und Impressum</h1>
          <p>
            brush.ingsparks.de ist ein privates, nicht kommerzielles Projekt von Tobias Jordans. Es
            gibt keine Konten, keine Cookies, kein Tracking und keine Werbung. Schrift, Bilder und
            Code kommen von dieser Seite; dein Browser ruft keine anderen Dienste auf.
          </p>
          <Section title="Was auf dem Server liegt">
            <p>
              Eure Familie liegt auf unserem Webspace bei all-inkl.com in Deutschland,{' '}
              <strong>unverschlüsselt</strong> in einer Datenbank: die Namen der Kinder, wie ihr sie
              eintragt, das gewählte Tier, wann geputzt wurde (Tag, morgens oder abends, Uhrzeit und
              Dauer) und die Ton-Einstellungen. Lesen kann das, wer euren Familien-Link hat,
              außerdem der Betreiber und der Hoster. Der Link selbst liegt auf dem Server nur als
              Fingerabdruck (SHA-256). Tragt deshalb am besten nur Vornamen oder Spitznamen ein.
            </p>
          </Section>
          <Section title="Belohnungsfotos">
            <p>
              Wenn ihr Fotos hochladet, werden sie auf eurem Gerät verkleinert (längste Seite
              höchstens 2048 Pixel); nur diese verkleinerte Kopie geht zum Server, das Original
              nicht. Sie liegen als Dateien auf demselben Webspace bei all-inkl.com in Deutschland,
              ebenfalls <strong>unverschlüsselt</strong>. Abrufen kann sie nur, wer euren
              Familien-Link hat. Der Betreiber und der Hoster könnten sie technisch einsehen. Wir
              werten die Fotos nicht aus und geben sie an niemanden weiter. Ihr löscht sie jederzeit
              unter Für Eltern → Belohnungsfotos, dann sind sie sofort weg.
            </p>
          </Section>
          <Section title="Was sonst anfällt">
            <p>
              Falsche Einladungswörter und falsche Links werden kurz gezählt, damit niemand raten
              kann: mit einem anonymisierten, täglich wechselnden Fingerabdruck der IP-Adresse,
              höchstens einen Tag lang. Der Webserver beim Hoster schreibt übliche
              Zugriffsprotokolle (IP-Adresse, Zeit, Adresse) nach dessen Regeln. Unser
              Fehlerprotokoll enthält keine Inhalte und keine IP-Adressen.
            </p>
          </Section>
          <Section title="Was im Browser liegt">
            <p>
              Eine Kopie eurer Familiendaten und der Familien-Schlüssel, damit die App auch ohne
              Netz funktioniert, dazu die Liste eurer Fotos (ohne die Bilder selbst; die lädt die
              App bei Bedarf vom Server und der Browser darf sie zwischenspeichern), außerdem die
              App-Dateien für den Start bei schwachem WLAN. „Auf diesem Gerät abmelden“ (Für Eltern
              → Weitere Handys) entfernt beides.
            </p>
          </Section>
          <Section title="Externe Dienste">
            <p>
              <strong>all-inkl.com</strong> (Neue Medien Münnich, Deutschland) hostet diese Seite
              und eure Daten und verarbeitet dabei technische Zugriffsdaten wie die IP-Adresse.
              Siehe{' '}
              <ExternalLink href="https://all-inkl.com/datenschutzinformationen">
                Datenschutzinformationen von all-inkl.com
              </ExternalLink>
              . Weitere Dienste gibt es nicht.
            </p>
          </Section>
          <Section title="Löschen">
            <p>
              Eine Familie löschen wir auf Anfrage per E-Mail an <Mail />, samt allen Einträgen und
              Fotos. Schickt dazu den Familien-Link mit. Im Browser entfernt „Auf diesem Gerät
              abmelden“ die lokale Kopie.
            </p>
          </Section>
          <Section title="Impressum">
            <p>
              Tobias Jordans, Böhmische Straße 54, 12055 Berlin, E-Mail: <Mail />. Privates, nicht
              kommerzielles Projekt.
            </p>
          </Section>
          <p>
            <ExternalLink href={FULL_TEXT_URL}>Vollständige Datenschutzhinweise</ExternalLink>
          </p>
        </Card>
      </div>
    </main>
  )
}

function Mail() {
  return (
    <a href="mailto:t@tobiasjordans.de" className="font-bold text-moss-700 underline">
      t@tobiasjordans.de
    </a>
  )
}
