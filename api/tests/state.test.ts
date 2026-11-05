import { beforeAll, describe, expect, test } from 'bun:test'
import { api, clearThrottle, ISO_MS, resetState } from './helpers'

const put = (version: number | string, data: unknown) =>
  api('/api/state', {
    method: 'PUT',
    headers: { 'If-Match': typeof version === 'number' ? `"${version}"` : version },
    body: { data },
  })

beforeAll(() => {
  clearThrottle()
  resetState()
})

describe('state', () => {
  test('empty before the first save', async () => {
    const res = await api('/api/state')
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ data: null, version: 0, updated_at: null })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  test('PUT without If-Match is 428', async () => {
    const res = await api('/api/state', { method: 'PUT', body: { data: {} } })
    expect(res.status).toBe(428)
    expect(res.json.error).toBe('precondition_required')
  })

  test('PUT with a garbage If-Match is 400', async () => {
    const res = await put('banana', {})
    expect(res.status).toBe(400)
  })

  test('PUT then GET roundtrip keeps the document as sent', async () => {
    const data = {
      family: { names: ['Mia', 'Zoë'] },
      empty: {},
      list: [],
      n: 1.5,
      text: 'Zähne ✨',
    }
    const saved = await put(0, data)
    expect(saved.status).toBe(200)
    expect(saved.json.version).toBe(1)
    expect(saved.json.updated_at).toMatch(ISO_MS)

    const read = await api('/api/state')
    expect(read.json.data).toEqual(data)
    expect(read.json.version).toBe(1)
    expect(read.json.updated_at).toBe(saved.json.updated_at)
    // empty object stays an object
    expect(read.text).toContain('"empty":{}')
    expect(read.text).toContain('"list":[]')
  })

  test('If-Match works with and without quotes', async () => {
    const res = await put('1', { v: 2 })
    expect(res.status).toBe(200)
    expect(res.json.version).toBe(2)
    const weak = await put('W/"2"', { v: 3 })
    expect(weak.status).toBe(200)
    expect(weak.json.version).toBe(3)
  })

  test('stale version is 409 with the current server state', async () => {
    const res = await put(0, { stale: true })
    expect(res.status).toBe(409)
    expect(res.json.error).toBe('conflict')
    expect(res.json.data).toEqual({ v: 3 })
    expect(res.json.version).toBe(3)
    expect(res.json.updated_at).toMatch(ISO_MS)
    // nothing was overwritten
    expect((await api('/api/state')).json.data).toEqual({ v: 3 })
  })

  test('a version from the future is also a conflict', async () => {
    expect((await put(99, { x: 1 })).status).toBe(409)
  })

  test.each([
    ['an array', { data: [1, 2] }],
    ['a string', { data: 'hello' }],
    ['null', { data: null }],
    ['a missing data field', { other: {} }],
    ['a plain array body', [{}]],
  ])('data that is %s is 400', async (_name, body) => {
    const res = await api('/api/state', { method: 'PUT', headers: { 'If-Match': '"3"' }, body })
    expect(res.status).toBe(400)
  })

  test('invalid JSON is 400', async () => {
    const res = await api('/api/state', {
      method: 'PUT',
      headers: { 'If-Match': '"3"' },
      body: '{nope',
    })
    expect(res.status).toBe(400)
  })

  test('more than 256 KiB of data is 413', async () => {
    const res = await put(3, { blob: 'x'.repeat(300 * 1024) })
    expect(res.status).toBe(413)
    const huge = await put(3, { blob: 'x'.repeat(2 * 1024 * 1024) })
    expect(huge.status).toBe(413)
  })

  test('just below the limit is accepted', async () => {
    const res = await put(3, { blob: 'x'.repeat(250 * 1024) })
    expect(res.status).toBe(200)
    expect(res.json.version).toBe(4)
  })

  test('parallel writers: exactly one wins', async () => {
    const current = (await api('/api/state')).json.version as number
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => put(current, { writer: i })),
    )
    const statuses = results.map((r) => r.status).toSorted((a, b) => a - b)
    expect(statuses.filter((s) => s === 200)).toHaveLength(1)
    expect(statuses.filter((s) => s === 409)).toHaveLength(11)
    expect((await api('/api/state')).json.version).toBe(current + 1)
  })

  test('PATCH is 405', async () => {
    const res = await api('/api/state', { method: 'PATCH' })
    expect(res.status).toBe(405)
  })
})
