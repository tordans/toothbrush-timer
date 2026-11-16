/**
 * The family key is the one secret of a family. It comes in two formats and the server accepts both:
 *  - a passphrase: lowercase words joined by '-', e.g. `tanne-mond-kiesel-...` (new families and
 *    every renewed key). Parents read it out and type it on another device.
 *  - the old random key: 43 base64url characters. Families that have not renewed still use it.
 * Only the server decides which key is valid; this file only recognizes the shapes.
 */

const PHRASE = /^[a-z]+(?:-[a-z]+){3,}$/
const RANDOM_LOOKING = /^[A-Za-z0-9_-]{16,}$/

/** True for a passphrase key, false for an old random key. */
export function isPassphrase(key: string): boolean {
  return PHRASE.test(key)
}

/** The words of a passphrase key, for showing them with spaces. */
export function passphraseWords(key: string): string[] {
  return key.split('-')
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * The key out of what someone typed or pasted: the family link, an old random key or a passphrase
 * typed by hand. Returns null if it looks like none of them.
 *
 * A passphrase gets normalized (lowercase, spaces, commas and dots become '-', repeats collapse).
 * A key from a link or an old random key is passed on exactly as it is: their case matters.
 */
export function familyKeyFromInput(input: string): string | null {
  const text = input.trim()
  const fromLink = /key=([^&\s#]+)/.exec(text)
  if (fromLink?.[1]) return safeDecode(fromLink[1])

  // "Tanne-Mond-Kiesel-Fuchs" is a passphrase typed with capitals; a random key never looks so.
  const parts = text.split('-')
  const capitalizedPhrase =
    parts.length >= 4 && parts.every((part) => /^[A-Za-z][a-z]*$/.test(part))
  if (RANDOM_LOOKING.test(text) && !capitalizedPhrase) return text

  const phrase = text
    .toLowerCase()
    .replace(/[\s,.;]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
  return PHRASE.test(phrase) ? phrase : null
}
