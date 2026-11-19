import { CloseIcon } from '@/components/icons'
import { Button, Card } from '@/components/ui'

/**
 * Opened by the "!" on the parents' gear with a plain tap: says what needs doing, without the
 * parents' question. Parents rarely fix it on the spot (they first make or pick a photo), so it
 * only informs; the button leads on through the parents' question.
 */
export function ParentHintDialog({
  hints,
  onOpenParents,
  onClose,
}: {
  hints: string[]
  onOpenParents: () => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute inset-0 z-20 flex overflow-y-auto bg-moss-950/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card className="m-auto flex w-full max-w-xl animate-fadein flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold">Für Eltern</h2>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer select-none items-center justify-center rounded-full bg-moss-50 text-bark-700 transition active:scale-90"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        {hints.map((hint) => (
          <p key={hint} className="text-base text-bark-800">
            {hint}
          </p>
        ))}
        <div className="flex flex-wrap gap-3">
          <Button onClick={onOpenParents}>Zu den Fotos</Button>
          <Button variant="secondary" onClick={onClose}>
            Später
          </Button>
        </div>
      </Card>
    </div>
  )
}
