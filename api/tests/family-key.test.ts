import { beforeAll, describe, expect, test } from 'bun:test'
import { api, createFamily, KEY_FORMAT, resetAll, sha256, sql } from './helpers'

beforeAll(resetAll)

const renew = (key: string | null) => api('/api/family/key', { method: 'POST', key })

describe('POST /api/family/key', () => {
  test('without a key it is 401', async () => {
    const res = await renew(null)
    expect(res.status).toBe(401)
    expect(res.json).toEqual({ error: 'unauthorized' })
  })

  test('with a wrong key it is 401', async () => {
    expect((await renew('nope')).status).toBe(401)
  })

  test('GET is 405', async () => {
    const res = await api('/api/family/key')
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('POST')
  })

  test('returns a new key, the old key stops working at once, the data stays', async () => {
    await resetAll()
    const oldKey = await createFamily()
    const other = await createFamily()
    const saved = await api('/api/state', {
      method: 'PUT',
      key: oldKey,
      headers: { 'If-Match': '"0"' },
      body: { data: { keep: 'me' } },
    })
    expect(saved.status).toBe(200)

    const res = await renew(oldKey)
    expect(res.status).toBe(200)
    expect(Object.keys(res.json)).toEqual(['key'])
    const newKey = res.json.key as string
    expect(newKey).toMatch(KEY_FORMAT)
    expect(newKey).not.toBe(oldKey)
    expect(res.headers.get('cache-control')).toBe('no-store')

    // old key: dead for reads, writes and renewing
    expect((await api('/api/state', { key: oldKey })).status).toBe(401)
    const oldPut = await api('/api/state', {
      method: 'PUT',
      key: oldKey,
      headers: { 'If-Match': '"1"' },
      body: { data: {} },
    })
    expect(oldPut.status).toBe(401)
    expect((await renew(oldKey)).status).toBe(401)

    // new key: same state
    const read = await api('/api/state', { key: newKey })
    expect(read.status).toBe(200)
    expect(read.json.data).toEqual({ keep: 'me' })
    expect(read.json.version).toBe(1)

    // the other family is not affected
    expect((await api('/api/state', { key: other })).status).toBe(200)
  })

  test('only the digest of the new key is stored', async () => {
    await resetAll()
    const key = await createFamily()
    const newKey = (await renew(key)).json.key as string
    expect(sql('SELECT key_sha256 FROM families').trim()).toBe(sha256(newKey))
  })

  test('renewing can be repeated', async () => {
    await resetAll()
    let key = await createFamily()
    for (let i = 0; i < 3; i++) {
      const res = await renew(key)
      expect(res.status).toBe(200)
      key = res.json.key
    }
    expect((await api('/api/state', { key })).status).toBe(200)
  })

  test('parallel renewals: exactly one wins', async () => {
    await resetAll()
    const key = await createFamily()
    const results = await Promise.all(Array.from({ length: 8 }, () => renew(key)))
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect(results.filter((r) => r.status === 401)).toHaveLength(7)
  })
})
