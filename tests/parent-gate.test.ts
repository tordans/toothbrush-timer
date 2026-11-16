import { describe, expect, it } from 'vitest'
import { ANIMALS } from '@/features/family/schema'
import {
  GATE_QUESTIONS,
  isGateAnswer,
  pickGateQuestion,
  shuffledAnimals,
} from '@/features/parent-gate/parent-gate'

describe('parent gate', () => {
  it('has exactly one question per animal', () => {
    expect(GATE_QUESTIONS.map((q) => q.answer).toSorted()).toEqual([...ANIMALS].toSorted())
    expect(new Set(GATE_QUESTIONS.map((q) => q.text)).size).toBe(ANIMALS.length)
  })

  it('never names an animal in its sentence', () => {
    const names = ['fuchs', 'igel', 'eule', 'hase', 'eichhörnchen', 'bär', 'koala']
    for (const { text } of GATE_QUESTIONS) {
      for (const name of names) expect(text.toLowerCase()).not.toMatch(new RegExp(`\\b${name}\\b`))
    }
  })

  it('picks the question from the random number, including the edges', () => {
    expect(pickGateQuestion(() => 0)).toBe(GATE_QUESTIONS[0])
    expect(pickGateQuestion(() => 0.9999)).toBe(GATE_QUESTIONS.at(-1))
    expect(pickGateQuestion(() => 1)).toBe(GATE_QUESTIONS.at(-1))
  })

  it('accepts only the described animal', () => {
    const question = GATE_QUESTIONS.find((q) => q.answer === 'squirrel')!
    expect(question.text).toContain('Nüsse')
    expect(isGateAnswer(question, 'squirrel')).toBe(true)
    for (const animal of ANIMALS.filter((a) => a !== 'squirrel')) {
      expect(isGateAnswer(question, animal)).toBe(false)
    }
  })

  it('shuffles all seven animals without losing one', () => {
    let seed = 1
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const shuffled = shuffledAnimals(random)
    expect(shuffled.toSorted()).toEqual([...ANIMALS].toSorted())
    expect(shuffled).not.toEqual([...ANIMALS])
  })
})
