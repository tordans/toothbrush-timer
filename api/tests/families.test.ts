import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  api,
  createFamily,
  createFamilyRequest,
  ISO_MS,
  KEY_FORMAT,
  resetAll,
  sha256,
  sql,
} from './helpers'

beforeAll(resetAll)
beforeEach(resetAll)

describe('POST /api/families', () => {
  test('the right invite word creates a family and returns its key', async () => {
    const res = await createFamilyRequest()
    expect(res.status).toBe(201)
    expect(Object.keys(res.json)).toEqual(['key'])
    expect(res.json.key).toMatch(KEY_FORMAT)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  test('the new key works and the family is empty', async () => {
    const key = await createFamily()
    const res = await api('/api/state', { key })
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ data: null, version: 0, updated_at: null })
  })

  test('only the SHA-256 of the key is stored', async () => {
    const key = await createFamily()
    expect(sql(`SELECT key_sha256 FROM families`).trim()).toBe(sha256(key))
    expect(sql(`SELECT COUNT(*) FROM families WHERE key_sha256 = '${key}'`).trim()).toBe('0')
  })

  test('every family gets a different key', async () => {
    const keys = [await createFamily(), await createFamily(), await createFamily()]
    expect(new Set(keys).size).toBe(3)
  })

  test.each([
    ['a wrong word', { invite: 'nope' }],
    ['the word in another case', { invite: 'DEV-INVITE' }],
    ['an empty word', { invite: '' }],
    ['no word', {}],
    ['a word that is not a string', { invite: 123 }],
  ])('%s is 403 invalid_invite and creates nothing', async (_name, body) => {
    const res = await api('/api/families', { method: 'POST', body })
    expect(res.status).toBe(403)
    expect(res.json).toEqual({ error: 'invalid_invite' })
    expect(sql('SELECT COUNT(*) FROM families').trim()).toBe('0')
  })

  test.each([
    ['invalid JSON', '{nope'],
    ['an array', '[]'],
    ['a string', '"dev-invite"'],
    ['an empty body', ''],
  ])('a body that is %s is 400', async (_name, body) => {
    const res = await api('/api/families', { method: 'POST', body })
    expect(res.status).toBe(400)
    expect(res.json.error).toBe('bad_request')
  })

  test('a huge body is 413', async () => {
    const res = await createFamilyRequest('x'.repeat(10_000))
    expect(res.status).toBe(413)
  })

  test('wrong method is 405', async () => {
    const res = await api('/api/families')
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('POST')
  })

  test('a key in the Authorization header is not needed and not used', async () => {
    const res = await api('/api/families', {
      method: 'POST',
      key: 'whatever',
      body: { invite: 'dev-invite' },
    })
    expect(res.status).toBe(201)
  })
})

describe('limits', () => {
  test('10 failed invite attempts per hour, then 429, even with the right word', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await createFamilyRequest(`wrong-${i}`)).status).toBe(403)
    }
    const blocked = await createFamilyRequest('wrong-again')
    expect(blocked.status).toBe(429)
    expect(blocked.json.error).toBe('too_many_attempts')
    expect(blocked.headers.get('retry-after')).toBe('3600')

    expect((await createFamilyRequest()).status).toBe(429)
    expect(sql('SELECT COUNT(*) FROM families').trim()).toBe('0')

    // Attempts older than an hour no longer count.
    sql('UPDATE invite_attempts SET attempted_at = attempted_at - INTERVAL 2 HOUR')
    expect((await createFamilyRequest()).status).toBe(201)
  })

  test('only the hash of the IP address is stored, not the address', async () => {
    await createFamilyRequest('wrong')
    const rows = sql('SELECT ip_hash FROM invite_attempts').trim().split('\n')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatch(/^[0-9a-f]{64}$/)
  })

  test('the successful requests do not count as failed attempts', async () => {
    for (let i = 0; i < 5; i++) expect((await createFamilyRequest()).status).toBe(201)
    expect(sql('SELECT COUNT(*) FROM invite_attempts').trim()).toBe('0')
  })

  test('at most 5 new families per day, then 429', async () => {
    for (let i = 0; i < 5; i++) expect((await createFamilyRequest()).status).toBe(201)
    const sixth = await createFamilyRequest()
    expect(sixth.status).toBe(429)
    expect(sixth.json.error).toBe('too_many_new_families')
    expect(sql('SELECT COUNT(*) FROM families').trim()).toBe('5')

    // A day later there is room again.
    sql('UPDATE families SET created_at = created_at - INTERVAL 2 DAY')
    expect((await createFamilyRequest()).status).toBe(201)
  })

  test('the daily limit does not tell a wrong word apart: wrong word is still 403', async () => {
    for (let i = 0; i < 5; i++) await createFamily()
    expect((await createFamilyRequest('wrong')).status).toBe(403)
  })

  test('at most 100 families in total, then 503 families_full', async () => {
    // 99 old families (created two days ago, so the daily limit is not involved)
    const rows = Array.from(
      { length: 99 },
      (_, i) => `('${sha256(`filler-${i}`)}', UTC_TIMESTAMP(3) - INTERVAL 2 DAY)`,
    )
    sql(`INSERT INTO families (key_sha256, created_at) VALUES ${rows.join(',')}`)

    expect((await createFamilyRequest()).status).toBe(201) // the 100th
    const full = await createFamilyRequest()
    expect(full.status).toBe(503)
    expect(full.json).toEqual({ error: 'families_full' })
    expect(sql('SELECT COUNT(*) FROM families').trim()).toBe('100')

    // Deleting a family (phpMyAdmin) frees a place.
    sql('DELETE FROM families ORDER BY id LIMIT 1')
    expect((await createFamilyRequest()).status).toBe(201)
  })
})

describe('families are isolated', () => {
  test('each key sees only its own state', async () => {
    const a = await createFamily()
    const b = await createFamily()
    const put = (key: string, version: number, data: unknown) =>
      api('/api/state', {
        method: 'PUT',
        key,
        headers: { 'If-Match': `"${version}"` },
        body: { data },
      })

    const savedA = await put(a, 0, { name: 'Anna' })
    expect(savedA.status).toBe(200)
    expect(savedA.json.updated_at).toMatch(ISO_MS)

    // B is still empty and starts at version 0
    expect((await api('/api/state', { key: b })).json).toEqual({
      data: null,
      version: 0,
      updated_at: null,
    })
    expect((await put(b, 0, { name: 'Ben' })).status).toBe(200)
    expect((await put(b, 1, { name: 'Ben 2' })).status).toBe(200)

    // A is untouched by B's saves; A's version is not B's version
    const readA = await api('/api/state', { key: a })
    expect(readA.json.data).toEqual({ name: 'Anna' })
    expect(readA.json.version).toBe(1)
    const readB = await api('/api/state', { key: b })
    expect(readB.json.data).toEqual({ name: 'Ben 2' })
    expect(readB.json.version).toBe(2)

    // A stale version of A is a conflict that shows A's data only
    const conflict = await put(a, 0, { name: 'late' })
    expect(conflict.status).toBe(409)
    expect(conflict.json.data).toEqual({ name: 'Anna' })
  })

  test('deleting a family in the database makes its key invalid', async () => {
    const key = await createFamily()
    sql('DELETE FROM families')
    const res = await api('/api/state', { key })
    expect(res.status).toBe(401)
  })
})
