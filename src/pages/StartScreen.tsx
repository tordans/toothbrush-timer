import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Card } from '@/components/ui'
import { familyKeyFromInput } from '@/features/family/family-key'
import { useFamily, useFamilyActions, useSyncStatus } from '@/features/family/family-store'
import { activeKids } from '@/features/family/queries'
import { Animal } from '@/features/forest/Animal'
import { createFamily } from '@/features/sync/api'

const CREATE_ERRORS = {
  invalid_invite: 'Das Einladungswort stimmt nicht.',
  too_many: 'Zu viele Versuche. Bitte in einer Stunde noch einmal.',
  full: 'Auf dem Server ist gerade kein Platz für neue Familien.',
  offline: 'Keine Verbindung zum Server. Bitte später noch einmal versuchen.',
} as const

/**
 * Shown whenever this device has no (valid) family link. There is no local-only mode: a family
 * starts with the invite word, every further device opens the family link.
 */
export function StartScreen() {
  const status = useSyncStatus()
  const family = useFamily()
  const { connect } = useFamilyActions()
  const expired = status === 'unauthorized'
  const hasLocalData = activeKids(family).length > 0

  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const linkKey = familyKeyFromInput(link)

  return (
    <main className="flex h-full touch-manipulation overflow-y-auto bg-moss-800 pb-[max(1rem,var(--safe-bottom))] pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-[max(1rem,var(--safe-top))]">
      <Card className="m-auto flex w-full max-w-md animate-fadein flex-col gap-5">
        <div className="flex items-center gap-3">
          <Animal animal="fox" className="h-16 w-16 shrink-0" />
          <div>
            <p className="text-sm font-bold text-moss-600">brush.ingsparks.de</p>
            <h1 className="text-2xl font-extrabold leading-tight">Zahnputz-Timer für Kinder</h1>
          </div>
        </div>

        {expired ? (
          <p className="rounded-2xl bg-[#fbd9d4] px-4 py-3 font-bold text-[#8a2f25]">
            Dieser Familien-Link gilt nicht mehr. Öffnet den neuen Link, den ihr bekommen habt.
          </p>
        ) : (
          <p className="text-bark-700">
            Zwei Minuten, vier Ecken, morgens und abends. Ruhig, ohne Punkte und Belohnungen. Zum
            Starten braucht ihr ein Einladungswort.
          </p>
        )}

        {!expired && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setBusy(true)
              setError(null)
              void createFamily(invite.trim()).then((result) => {
                setBusy(false)
                if (result.kind === 'ok') connect(result.key)
                else setError(CREATE_ERRORS[result.kind])
              })
            }}
          >
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="Einladungswort"
              aria-label="Einladungswort"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="rounded-2xl border-2 border-bark-200 bg-white px-4 py-3 text-lg"
            />
            {error && <p className="text-sm font-bold text-[#8a2f25]">{error}</p>}
            <Button type="submit" size="lg" disabled={busy || invite.trim().length === 0}>
              {busy ? 'Einen Moment …' : 'Los geht’s'}
            </Button>
            {hasLocalData && (
              <p className="text-sm text-bark-600">
                Was auf diesem Gerät schon eingetragen ist, wird übernommen.
              </p>
            )}
          </form>
        )}

        <details className="rounded-2xl bg-moss-50 px-4 py-3" open={expired}>
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">
            Ihr nutzt die App schon auf einem anderen Handy?
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-sm text-bark-700">
              Dann öffnet auf diesem Gerät einfach euren Familien-Link. Ihr findet ihn auf dem
              anderen Handy unter „Für Eltern“ → „Weitere Handys“. Oder gebt hier das
              Familien-Passwort ein (Wörter wie „tanne mond kiesel …“) oder fügt den Link ein:
            </p>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Familien-Link oder Familien-Passwort"
              aria-label="Familien-Link oder Familien-Passwort"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="rounded-2xl border-2 border-bark-200 bg-white px-4 py-2.5 font-mono text-base"
            />
            <Button
              variant="secondary"
              disabled={!linkKey}
              onClick={() => {
                if (linkKey) connect(linkKey)
              }}
            >
              Verbinden
            </Button>
          </div>
        </details>

        <Link
          to="/datenschutz"
          className="inline-flex min-h-11 items-center self-start text-sm font-bold text-moss-700 underline"
        >
          Datenschutz und Impressum
        </Link>
      </Card>
    </main>
  )
}
