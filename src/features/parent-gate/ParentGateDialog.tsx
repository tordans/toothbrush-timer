import { useState } from 'react'
import { CloseIcon } from '@/components/icons'
import { Card } from '@/components/ui'
import type { Animal as AnimalId } from '@/features/family/schema'
import { Animal } from '@/features/forest/Animal'
import { isGateAnswer, pickGateQuestion, shuffledAnimals } from './parent-gate'

/**
 * Shown after the gear was held: an adult reads the sentence and taps the described animal.
 * The animals have no names on screen, so a child cannot match a word. A wrong tap closes
 * quietly without showing which one was right. A new question comes with every opening,
 * because the parent unmounts this dialog when it closes.
 */
export function ParentGateDialog({ onPass, onClose }: { onPass: () => void; onClose: () => void }) {
  const [question] = useState(() => pickGateQuestion())
  const [animals] = useState(() => shuffledAnimals())

  const tap = (animal: AnimalId) => {
    if (isGateAnswer(question, animal)) onPass()
    else onClose()
  }

  return (
    <div
      className="absolute inset-0 z-20 flex overflow-y-auto bg-moss-950/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card className="m-auto flex w-full max-w-xl animate-fadein flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-moss-600">
              Nur für Eltern
            </h2>
            <p className="text-sm text-bark-600">
              Damit wir wissen, dass hier ein Erwachsener tippt, eine kleine Frage:
            </p>
          </div>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer select-none items-center justify-center rounded-full bg-moss-50 text-bark-700 transition active:scale-90"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <p className="border-t-2 border-bark-100 pt-4 text-lg font-bold text-bark-900 sm:text-xl">
          {question.text}
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {animals.map((animal, index) => (
            <button
              key={animal}
              type="button"
              // No animal name here either: a name read out aloud would give the answer away.
              aria-label={`Tier ${index + 1}`}
              onClick={() => tap(animal)}
              className="flex min-h-11 cursor-pointer select-none items-center justify-center rounded-2xl bg-moss-50 p-1.5 transition active:scale-95"
            >
              <Animal animal={animal} className="h-14 w-14" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
