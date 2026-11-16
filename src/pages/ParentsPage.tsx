import { Link, useNavigate } from '@tanstack/react-router'
import { subDays } from 'date-fns'
import { useState, type ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import { ChevronLeft, MoonIcon, SunIcon } from '@/components/icons'
import { AnimalBadge, AnimalPicker, Button, Card, Toggle, ToothbrushPicker } from '@/components/ui'
import { isPassphrase, passphraseWords } from '@/features/family/family-key'
import {
  useFamily,
  useFamilyActions,
  useFamilyKey,
  useLastSyncedAt,
  useSyncStatus,
  type SyncStatus,
} from '@/features/family/family-store'
import { activeKids, brushingsFor } from '@/features/family/queries'
import { SLOTS, type Animal as AnimalId, type Kid, type Toothbrush } from '@/features/family/schema'
import { ANIMAL_NAMES } from '@/features/forest/Animal'
import { PhotoManager } from '@/features/photos/PhotoManager'
import { renewFamilyKey } from '@/features/sync/api'
import { syncNow } from '@/features/sync/sync-engine'
import { useNow } from '@/hooks/use-now'
import { dayMonth, dayMonthShort, isoDay, timeLabel, weekdayShort } from '@/lib/dates'

export function ParentsPage() {
  const navigate = useNavigate()
  return (
    <main className="h-full touch-manipulation overflow-y-auto bg-moss-800 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* The one way out stays in view while scrolling, like on the calendar. */}
      <div className="sticky top-0 z-10 bg-moss-800/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          <Button variant="ghost" onClick={() => void navigate({ to: '/' })}>
            <ChevronLeft className="h-5 w-5" />
            Zurück in den Wald
          </Button>
        </div>
      </div>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-16">
        <h1 className="px-1 text-3xl font-extrabold text-cream">Für Eltern</h1>
        <KidsSection />
        <CalendarSection />
        <SoundSection />
        <PhotosSection />
        <DevicesSection />
        <AboutSection />
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {children}
    </Card>
  )
}

function KidsSection() {
  const family = useFamily()
  const kids = activeKids(family)
  const { addKid } = useFamilyActions()
  const [adding, setAdding] = useState(false)

  return (
    <Section title="Kinder">
      {kids.map((kid) => (
        <KidRow key={kid.id} kid={kid} />
      ))}
      {adding ? (
        <KidForm
          submitLabel="Hinzufügen"
          onCancel={() => setAdding(false)}
          onSubmit={(name, animal, toothbrush) => {
            addKid(name, animal, toothbrush)
            setAdding(false)
          }}
        />
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          + Kind hinzufügen
        </Button>
      )}
    </Section>
  )
}

function KidRow({ kid }: { kid: Kid }) {
  const { updateKid, deleteKid } = useFamilyActions()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <KidForm
        initialName={kid.name}
        initialAnimal={kid.animal}
        initialToothbrush={kid.toothbrush ?? 'electric'}
        submitLabel="Speichern"
        onCancel={() => setEditing(false)}
        onDelete={() => {
          if (
            window.confirm(`${kid.name} wirklich entfernen? Die Putz-Tage werden ausgeblendet.`)
          ) {
            deleteKid(kid.id)
          }
        }}
        onSubmit={(name, animal, toothbrush) => {
          updateKid(kid.id, { name, animal, toothbrush })
          setEditing(false)
        }}
      />
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-2 pr-3">
      <AnimalBadge animal={kid.animal} />
      <div className="flex-1">
        <p className="text-lg font-extrabold">{kid.name}</p>
        <p className="text-sm text-bark-600">
          putzt mit {ANIMAL_NAMES[kid.animal]} ·{' '}
          {kid.toothbrush === 'manual' ? 'Handzahnbürste, 3 Minuten' : 'elektrisch, 2 Minuten'}
        </p>
      </div>
      <Button variant="secondary" onClick={() => setEditing(true)}>
        Ändern
      </Button>
    </div>
  )
}

function KidForm({
  initialName = '',
  initialAnimal = 'fox',
  initialToothbrush = null,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initialName?: string
  initialAnimal?: AnimalId
  initialToothbrush?: Toothbrush | null
  submitLabel: string
  onSubmit: (name: string, animal: AnimalId, toothbrush: Toothbrush) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initialName)
  const [animal, setAnimal] = useState<AnimalId>(initialAnimal)
  const [toothbrush, setToothbrush] = useState<Toothbrush | null>(initialToothbrush)
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl bg-moss-50 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim() && toothbrush) onSubmit(name.trim(), animal, toothbrush)
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="Vorname"
        aria-label="Vorname"
        className="rounded-2xl border-2 border-bark-200 bg-white px-4 py-2.5 text-lg font-bold"
      />
      <AnimalPicker value={animal} onChange={setAnimal} />
      <ToothbrushPicker value={toothbrush} onChange={setToothbrush} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!name.trim() || !toothbrush}>
          {submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
        {onDelete && (
          <Button variant="danger" onClick={onDelete} className="ml-auto">
            Entfernen
          </Button>
        )}
      </div>
    </form>
  )
}

const CALENDAR_DAYS = 14

function CalendarSection() {
  const family = useFamily()
  const kids = activeKids(family)
  const { setBrushed } = useFamilyActions()
  const now = useNow()
  const [kidId, setKidId] = useState<string | null>(null)
  const kid = kids.find((k) => k.id === kidId) ?? kids[0]
  if (!kid) return null

  const days = Array.from({ length: CALENDAR_DAYS }, (_, i) => subDays(now, i))

  return (
    <Section title="Putz-Tage korrigieren">
      <p className="text-sm text-bark-600">
        Vergessen einzutragen oder aus Versehen gestartet? Hier lässt sich jeder Morgen und Abend
        der letzten zwei Wochen an- und abhaken.
      </p>
      {kids.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {kids.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKidId(k.id)}
              className={twMerge(
                'min-h-11 rounded-full px-4 py-1.5 font-bold transition active:scale-95',
                k.id === kid.id ? 'bg-moss-600 text-white' : 'bg-white',
              )}
            >
              {k.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col divide-y divide-bark-100 rounded-2xl bg-white">
        {days.map((d) => {
          const key = isoDay(d)
          return (
            <div key={key} className="flex items-center gap-2 px-3 py-2">
              <span className="w-24 shrink-0 font-bold">
                {weekdayShort(d)}, {dayMonthShort(d)}
              </span>
              {SLOTS.map((slot) => {
                const entries = brushingsFor(family, kid.id, key, slot)
                const done = entries.length > 0
                const first = entries[0]
                return (
                  <button
                    key={slot}
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`${slot === 'morning' ? 'Morgens' : 'Abends'} ${dayMonth(d)}`}
                    onClick={() => setBrushed(kid.id, key, slot, !done)}
                    className={twMerge(
                      'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-bold transition active:scale-95',
                      done
                        ? slot === 'morning'
                          ? 'bg-sun text-bark-900'
                          : 'bg-dusk text-white'
                        : 'bg-bark-100 text-bark-500',
                    )}
                  >
                    {slot === 'morning' ? (
                      <SunIcon className="h-4 w-4" />
                    ) : (
                      <MoonIcon className="h-4 w-4" />
                    )}
                    {done && first ? (first.source === 'timer' ? timeLabel(first.at) : 'ja') : '–'}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function SoundSection() {
  const { music, gong } = useFamily().settings
  const { updateSettings } = useFamilyActions()
  return (
    <Section title="Ton">
      <Toggle
        label="Musik beim Putzen"
        checked={music}
        onChange={(v) => updateSettings({ music: v })}
      />
      {music && (
        <p className="text-sm text-bark-600">
          Jedes Tier hat sein eigenes Lied. Der Gong bei jeder neuen Ecke passt dazu.
        </p>
      )}
      <Toggle
        label="Gong bei jeder neuen Ecke"
        checked={gong}
        onChange={(v) => updateSettings({ gong: v })}
      />
      <p className="text-sm text-bark-600">
        Auf dem iPhone: Ton ist auch bei stummgeschaltetem Gerät zu hören, solange die Lautstärke
        nicht ganz unten ist.
      </p>
    </Section>
  )
}

function PhotosSection() {
  return (
    <Section title="Belohnungsfotos">
      <PhotoManager />
    </Section>
  )
}

const STATUS_TEXT: Record<SyncStatus, string> = {
  local: 'Nicht verbunden.',
  syncing: 'Gleicht ab …',
  synced: 'Alles gespeichert.',
  offline: 'Keine Verbindung. Wird nachgeholt, sobald das Gerät wieder online ist.',
  unauthorized: 'Der Familien-Link gilt nicht mehr. Bitte den neuen Link öffnen.',
  incompatible:
    'Auf dem Server liegen Daten einer neueren Version. Bitte die Seite neu laden. Bis dahin wird nur auf diesem Gerät gespeichert.',
}

type ShareNavigator = Navigator & {
  share?: (data: { title?: string; url?: string }) => Promise<void>
}

function DevicesSection() {
  const familyKey = useFamilyKey()
  const status = useSyncStatus()
  const lastSyncedAt = useLastSyncedAt()
  const { connect, disconnect } = useFamilyActions()
  const [copied, setCopied] = useState(false)

  const link = familyKey ? `${window.location.origin}/#key=${encodeURIComponent(familyKey)}` : ''
  const nav = navigator as ShareNavigator

  const copy = () => {
    void navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const renew = async () => {
    if (!familyKey) return
    if (
      !window.confirm(
        'Neuen Familien-Link erzeugen? Der alte Link geht dann sofort nicht mehr, auch auf den anderen Handys. Dort müsst ihr den neuen Link öffnen.',
      )
    )
      return
    const result = await renewFamilyKey(familyKey)
    if (result.kind === 'ok') connect(result.key)
    else
      window.alert(
        result.kind === 'unauthorized'
          ? 'Der aktuelle Link gilt schon nicht mehr.'
          : 'Keine Verbindung zum Server. Bitte später noch einmal versuchen.',
      )
  }

  return (
    <Section title="Weitere Handys">
      <p className="text-sm text-bark-700">
        Öffnet diesen Familien-Link auf jedem Handy, das mitmachen soll. Alle sehen dann dieselben
        Kinder und dieselbe Woche. Wer den Link oder das Passwort hat, kann alles sehen und ändern,
        also nur in der Familie weitergeben und am besten im Passwortmanager speichern.
      </p>
      <p className="text-sm text-bark-700">
        Auf iPhone und iPad: Den Link in Safari öffnen, dann „Teilen“ → „Zum Home-Bildschirm“. Die
        App auf dem Home-Bildschirm ist dann gleich mit eurer Familie verbunden.
      </p>
      {familyKey && isPassphrase(familyKey) && (
        <div className="flex flex-col gap-1 rounded-2xl bg-moss-50 px-4 py-3">
          <p className="text-sm font-bold text-moss-800">Familien-Passwort</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-2xl font-extrabold leading-snug text-bark-800">
            {passphraseWords(familyKey).map((word, index) => (
              <span key={`${index}-${word}`}>{word}</span>
            ))}
          </p>
          <p className="text-sm text-bark-700">
            Zum Eintippen auf einem anderen Gerät: auf dem Startbildschirm „Ihr nutzt die App schon
            auf einem anderen Handy?“ öffnen und die Wörter eingeben. Groß- und Kleinschreibung und
            Leerzeichen sind egal.
          </p>
        </div>
      )}
      <input
        readOnly
        value={link}
        aria-label="Familien-Link"
        onFocus={(e) => e.currentTarget.select()}
        className="rounded-xl border-2 border-bark-200 bg-white px-3 py-2 font-mono text-base"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy}>{copied ? 'Kopiert' : 'Link kopieren'}</Button>
        {nav.share && (
          <Button
            variant="secondary"
            onClick={() =>
              void nav.share?.({ title: 'Zähneputzen', url: link }).catch(() => undefined)
            }
          >
            Teilen …
          </Button>
        )}
      </div>
      <p
        className={twMerge(
          'rounded-2xl px-4 py-2 text-sm font-bold',
          status === 'synced' || status === 'syncing'
            ? 'bg-moss-100 text-moss-800'
            : 'bg-[#fbd9d4] text-[#8a2f25]',
        )}
      >
        {STATUS_TEXT[status]}
        {lastSyncedAt &&
          status === 'synced' &&
          ` Zuletzt abgeglichen um ${timeLabel(lastSyncedAt)}.`}
        {status !== 'synced' && status !== 'syncing' && (
          <button
            type="button"
            className="ml-1 inline-flex min-h-11 items-center px-2 underline"
            onClick={() => void syncNow()}
          >
            Erneut versuchen
          </button>
        )}
      </p>
      {familyKey && !isPassphrase(familyKey) && (
        <p className="rounded-2xl bg-moss-50 px-4 py-3 text-sm text-bark-700">
          Euer Familien-Link ist noch ein langer Zufallscode. Mit „Neuen Link erzeugen“ bekommt ihr
          stattdessen ein Passwort aus Wörtern, das sich gut vorlesen und eintippen lässt. Der alte
          Link geht dann auf allen Handys nicht mehr, dort müsst ihr den neuen Link oder das
          Passwort eingeben.
        </p>
      )}
      <div className="flex flex-wrap gap-2 border-t-2 border-bark-100 pt-4">
        <Button variant="secondary" onClick={() => void renew()}>
          Neuen Link erzeugen
        </Button>
        <Button
          variant="danger"
          className="ml-auto"
          onClick={() => {
            if (
              window.confirm(
                'Auf diesem Gerät abmelden? Die Einträge bleiben auf dem Server. Zum Zurückkommen braucht ihr den Familien-Link.',
              )
            )
              disconnect()
          }}
        >
          Auf diesem Gerät abmelden
        </Button>
      </div>
    </Section>
  )
}

function AboutSection() {
  return (
    <Section title="Über brush.ingsparks.de">
      <p>
        Ein ruhiger Zahnputz-Timer: zwei Minuten, vier Ecken, morgens und abends. Es gibt keine
        Punkte, keine Sammelbilder und keine Serien, die reißen können. Jedes Putzen öffnet eine
        Blume oder zündet eine Laterne an, und die Woche im Wald füllt sich.
      </p>
      <p className="text-sm text-bark-600">
        Die Daten liegen auf unserem eigenen Webspace in Deutschland und als Kopie auf diesem Gerät.
        Keine Werbung, kein Tracking.{' '}
        <Link to="/datenschutz" className="font-bold text-moss-700 underline">
          Datenschutz und Impressum
        </Link>
      </p>
    </Section>
  )
}
