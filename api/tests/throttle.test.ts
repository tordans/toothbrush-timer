import { afterAll, beforeAll, expect, test } from 'bun:test'
import { api, clearThrottle, FAMILY_KEY } from './helpers'

beforeAll(() => clearThrottle())
afterAll(() => clearThrottle())

test('after 20 wrong keys the client gets 429, even with the right key', async () => {
  for (let i = 0; i < 20; i++) {
    const res = await api('/api/state', { key: `wrong-${i}` })
    expect(res.status).toBe(401)
  }
  const blocked = await api('/api/state', { key: 'wrong-again' })
  expect(blocked.status).toBe(429)
  expect(blocked.json.error).toBe('too_many_attempts')
  expect(blocked.headers.get('retry-after')).toBe('600')

  expect((await api('/api/state', { key: FAMILY_KEY })).status).toBe(429)
  // health stays reachable
  expect((await api('/api/health', { key: null })).status).toBe(200)

  clearThrottle()
  expect((await api('/api/state', { key: FAMILY_KEY })).status).toBe(200)
})

test('a missing key is not counted as a failed attempt', async () => {
  clearThrottle()
  for (let i = 0; i < 25; i++) {
    expect((await api('/api/state', { key: null })).status).toBe(401)
  }
  expect((await api('/api/state', { key: FAMILY_KEY })).status).toBe(200)
})
