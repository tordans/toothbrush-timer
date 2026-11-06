import { useNavigate } from '@tanstack/react-router'
import { subDays } from 'date-fns'
import { useState, type ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import { ChevronLeft, MoonIcon, SunIcon } from '@/components/icons'
import { AnimalBadge, AnimalPicker, Button, Card, Toggle } from '@/components/ui'
import {
  useFamily,
  useFamilyActions,
  useFamilyKey,
  useLastSyncedAt,
  useSyncStatus,
  type SyncStatus,
} from '@/features/family/family-store'
import { activeKids, brushingsFor } from '@/features/family/queries'
import { SLOTS, type Animal as AnimalId, type Kid } from '@/features/family/schema'
import { ANIMAL_NAMES } from '@/features/forest/Animal'
import { syncNow } from '@/features/sync/sync-engine'
import { useNow } from '@/hooks/use-now'
import { dayMonth, dayMonthShort, isoDay, timeLabel, weekdayShort } from '@/lib/dates'

export function ParentsPage() {
  const navigate = useNavigate()
  return (
    <main className="h-full overflow-y-auto bg-moss-800">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-16">
        <div className="flex items-center gap-3 text-cream">
          <Button variant="ghost" onClick={() => void navigate({ to: '/' })}>
            <ChevronLeft className="h-5 w-5" />
            Zurück in den Wald
          </Button>
        </div>
        <h1 className="px-1 text-3xl font-extrabold text-cream">Für Eltern</h1>
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => void navigate({ to: '/uebersicht' })}
        >
          Alle Monate ansehen
        </Button>
        <KidsSection />
        <CalendarSection />
        <SoundSection />
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
          onSubmit={(name, animal) => {
            addKid(name, animal)
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
        submitLabel="Speichern"
        onCancel={() => setEditing(false)}
        onDelete={() => {
          if (
            window.confirm(`${kid.name} wirklich entfernen? Die Putz-Tage werden ausgeblendet.`)
          ) {
            deleteKid(kid.id)
          }
        }}
        onSubmit={(name, animal) => {
          updateKid(kid.id, { name, animal })
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
        <p className="text-sm text-bark-600">putzt mit {ANIMAL_NAMES[kid.animal]}</p>
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
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initialName?: string
  initialAnimal?: AnimalId
  submitLabel: string
  onSubmit: (name: string, animal: AnimalId) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(initialName)
  const [animal, setAnimal] = useState<AnimalId>(initialAnimal)
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl bg-moss-50 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSubmit(name.trim(), animal)
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
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!name.trim()}>
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
                'rounded-full px-4 py-1.5 font-bold',
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
                      'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-bold',
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
        label="Ruhige Musik beim Putzen"
        checked={music}
        onChange={(v) => updateSettings({ music: v })}
      />
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

const STATUS_TEXT: Record<SyncStatus, string> = {
  local: 'Nur auf diesem Gerät gespeichert.',
  syncing: 'Gleicht ab …',
  synced: 'Mit dem Familien-Speicher abgeglichen.',
  offline: 'Keine Verbindung. Wird nachgeholt, sobald das Gerät wieder online ist.',
  unauthorized: 'Der Familien-Link gilt nicht mehr. Bitte den neuen Link öffnen.',
  incompatible:
    'Auf dem Server liegen Daten einer neueren Version. Bitte die Seite neu laden. Bis dahin wird nur auf diesem Gerät gespeichert.',
}

function DevicesSection() {
  const familyKey = useFamilyKey()
  const status = useSyncStatus()
  const lastSyncedAt = useLastSyncedAt()
  const { connect, disconnect } = useFamilyActions()
  const [input, setInput] = useState('')
  const [showLink, setShowLink] = useState(false)

  const link = familyKey ? `${window.location.origin}/#key=${encodeURIComponent(familyKey)}` : ''

  const submit = () => {
    const value = input.trim()
    const match = /key=([^&\s]+)/.exec(value)
    const key = match?.[1] ? decodeURIComponent(match[1]) : value
    if (key.length >= 16) {
      connect(key)
      setInput('')
    }
  }

  return (
    <Section title="Handys verbinden">
      <p
        className={twMerge(
          'rounded-2xl px-4 py-3 font-bold',
          status === 'synced' && 'bg-moss-100 text-moss-800',
          status === 'local' && 'bg-bark-100 text-bark-800',
          (status === 'offline' || status === 'syncing') && 'bg-[#fdf1cf] text-bark-800',
          (status === 'unauthorized' || status === 'incompatible') && 'bg-[#fbd9d4] text-[#8a2f25]',
        )}
      >
        {STATUS_TEXT[status]}
        {lastSyncedAt && status !== 'local' && (
          <span className="block text-sm font-semibold opacity-75">
            Zuletzt abgeglichen um {timeLabel(lastSyncedAt)}
          </span>
        )}
      </p>

      {familyKey ? (
        <>
          <p className="text-sm text-bark-600">
            Alle Geräte mit demselben Familien-Link sehen dieselben Kinder und Putz-Tage. Ohne Netz
            wird lokal gespeichert und später zusammengeführt.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void syncNow()}>
              Jetzt abgleichen
            </Button>
            <Button variant="secondary" onClick={() => setShowLink((v) => !v)}>
              {showLink ? 'Link verbergen' : 'Link für ein weiteres Gerät'}
            </Button>
            <Button
              variant="danger"
              className="ml-auto"
              onClick={() => {
                if (window.confirm('Dieses Gerät vom Familien-Speicher trennen?')) disconnect()
              }}
            >
              Trennen
            </Button>
          </div>
          {showLink && (
            <div className="flex flex-col gap-2 rounded-2xl bg-white p-3">
              <p className="text-sm font-bold">
                Diesen Link auf dem anderen Gerät öffnen. Wer ihn hat, kann alles sehen und ändern,
                also nur in der Familie weitergeben.
              </p>
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="rounded-xl border-2 border-bark-200 px-3 py-2 font-mono text-sm"
              />
            </div>
          )}
        </>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <p className="text-sm text-bark-600">
            Damit beide Handys dieselbe Woche zeigen: den Familien-Link öffnen oder hier einfügen.
            Was auf diesem Gerät schon eingetragen ist, bleibt erhalten und wird übernommen.
          </p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://brush.ingsparks.de/#key=…"
            aria-label="Familien-Link"
            className="rounded-2xl border-2 border-bark-200 bg-white px-4 py-2.5 font-mono text-sm"
          />
          <Button type="submit" disabled={input.trim().length < 16}>
            Verbinden
          </Button>
        </form>
      )}
    </Section>
  )
}

function AboutSection() {
  return (
    <Section title="Über Brushing Sparks">
      <p>
        Ein ruhiger Zahnputz-Timer: zwei Minuten, vier Ecken, morgens und abends. Es gibt keine
        Punkte, keine Sammelbilder und keine Serien, die reißen können. Jedes Putzen öffnet eine
        Blume oder zündet eine Laterne an, und die Woche im Wald füllt sich.
      </p>
      <p className="text-sm text-bark-600">
        Die Daten liegen auf diesem Gerät und, wenn verbunden, auf unserem eigenen Webspace in
        Deutschland. Keine Werbung, kein Tracking.
      </p>
    </Section>
  )
}
