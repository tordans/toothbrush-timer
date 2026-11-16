import { expect, test } from 'bun:test'
import path from 'node:path'

const source = await Bun.file(path.join(import.meta.dir, '../src/wordlist.php')).text()
const body = source.slice(source.indexOf('return ['))
const words = [...body.matchAll(/'([^']*)'/g)].map((m) => m[1]!)

test('the word list has enough words for 6 words with at least 60 bits', () => {
  expect(words.length).toBeGreaterThanOrEqual(1024)
  expect(6 * Math.log2(words.length)).toBeGreaterThanOrEqual(60)
})

test('every word is lowercase ASCII, 3 to 8 letters, and there are no duplicates', () => {
  for (const word of words) expect(word).toMatch(/^[a-z]{3,8}$/)
  expect(new Set(words).size).toBe(words.length)
})
