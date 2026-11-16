import { ANIMALS, type Animal } from '@/features/family/schema'

/**
 * A small gate in front of the parents' area: a long German sentence that only a fluent reader
 * understands asks for one animal by a feature, never by name. Each feature belongs to exactly
 * one of the seven animals and is not something a small child can guess from the drawing alone.
 */
const INTRO = 'Bitte tippe auf das Tier,'

const FEATURES: Record<Animal, string> = {
  fox: 'das in Fabeln als schlau und listig gilt und im Winter mit einem hohen Sprung kopfüber in den Schnee taucht.',
  hedgehog:
    'das sich bei Gefahr zu einer stacheligen Kugel zusammenrollt und den Winter unter einem Laubhaufen verschläft.',
  owl: 'das nachts lautlos durch den Wald fliegt und seinen Kopf fast ganz nach hinten drehen kann.',
  rabbit: 'das zu Ostern bunte Eier bringen soll und am liebsten Klee und Möhren knabbert.',
  squirrel: 'das einen langen, buschigen Schwanz hat und Nüsse für den Winter versteckt.',
  bear: 'das den Winter in einer Höhle verschläft und für Honig sogar in einen Bienenstock greift.',
  koala: 'das aus Australien kommt, fast den ganzen Tag schläft und nur Eukalyptusblätter frisst.',
}

export type GateQuestion = { answer: Animal; text: string }

/** All questions, one per animal. */
export const GATE_QUESTIONS: GateQuestion[] = ANIMALS.map((answer) => ({
  answer,
  text: `${INTRO} ${FEATURES[answer]}`,
}))

/** `random` returns a number in [0, 1), like Math.random; injectable for tests. */
export function pickGateQuestion(random: () => number = Math.random): GateQuestion {
  const index = Math.min(Math.floor(random() * GATE_QUESTIONS.length), GATE_QUESTIONS.length - 1)
  return GATE_QUESTIONS[index]!
}

export function isGateAnswer(question: GateQuestion, tapped: Animal): boolean {
  return question.answer === tapped
}

/** A shuffled copy of the animals (Fisher–Yates), so the right one is never in a fixed place. */
export function shuffledAnimals(random: () => number = Math.random): Animal[] {
  const list = [...ANIMALS]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[list[i], list[j]] = [list[j]!, list[i]!]
  }
  return list
}
