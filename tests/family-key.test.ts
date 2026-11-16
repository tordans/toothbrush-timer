import { describe, expect, test } from 'vitest'
import { familyKeyFromInput, isPassphrase, passphraseWords } from '@/features/family/family-key'

const PHRASE = 'tanne-mond-kiesel-fuchs-wiese-igel'
const OLD_KEY = 'Ab3_dEf-GhIjKlMnOpQrStUvWxYz0123456789AbCdEf'

describe('familyKeyFromInput', () => {
  test('a passphrase stays as it is', () => {
    expect(familyKeyFromInput(PHRASE)).toBe(PHRASE)
  })

  test.each([
    ['spaces', 'tanne mond kiesel fuchs wiese igel'],
    ['capitals and spaces', '  Tanne Mond Kiesel Fuchs Wiese Igel  '],
    ['capitals with dashes', 'Tanne-Mond-Kiesel-Fuchs-Wiese-Igel'],
    ['commas', 'tanne, mond, kiesel, fuchs, wiese, igel'],
    ['dots', 'tanne.mond.kiesel.fuchs.wiese.igel'],
    ['mixed separators and repeats', 'tanne -- mond,, kiesel . fuchs   wiese-igel.'],
  ])('a typed passphrase with %s is normalized', (_name, typed) => {
    expect(familyKeyFromInput(typed)).toBe(PHRASE)
  })

  test('an old random key is passed on exactly, case included', () => {
    expect(familyKeyFromInput(OLD_KEY)).toBe(OLD_KEY)
    expect(familyKeyFromInput(` ${OLD_KEY}\n`)).toBe(OLD_KEY)
  })

  test('an old key made only of letters and dashes keeps its capitals', () => {
    const key = 'aBcDeFgH-iJkLmNoP-qRsTuVwX-yZaBcDeFgHiJkLm'
    expect(familyKeyFromInput(key)).toBe(key)
  })

  test('the key out of a family link, for both formats', () => {
    expect(familyKeyFromInput(`https://brush.ingsparks.de/#key=${PHRASE}`)).toBe(PHRASE)
    expect(
      familyKeyFromInput(`https://brush.ingsparks.de/#key=${encodeURIComponent(OLD_KEY)}`),
    ).toBe(OLD_KEY)
  })

  test.each(['', '   ', 'hallo', 'tanne mond', 'tanne mond kiesel', 'tanne 123 mond kiesel fuchs'])(
    '%j is not a key',
    (typed) => {
      expect(familyKeyFromInput(typed)).toBeNull()
    },
  )
})

describe('passphrase helpers', () => {
  test('tell the formats apart', () => {
    expect(isPassphrase(PHRASE)).toBe(true)
    expect(isPassphrase(OLD_KEY)).toBe(false)
    expect(passphraseWords(PHRASE)).toEqual(['tanne', 'mond', 'kiesel', 'fuchs', 'wiese', 'igel'])
  })
})
