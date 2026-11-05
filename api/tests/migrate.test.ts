import { beforeAll, describe, expect, test } from 'bun:test'
import { api, clearThrottle, DEPLOY_KEY, FAMILY_KEY, resetState, sql } from './helpers'

beforeAll(() => {
  clearThrottle()
  resetState()
})

describe('migrate', () => {
  test('needs the deploy key', async () => {
    expect((await api('/api/migrate', { method: 'POST', key: null })).status).toBe(401)
    expect((await api('/api/migrate', { method: 'POST', key: FAMILY_KEY })).status).toBe(401)
  })

  test('GET is 405', async () => {
    expect((await api('/api/migrate', { key: DEPLOY_KEY })).status).toBe(405)
  })

  test('is idempotent: nothing pending after the container start', async () => {
    const first = await api('/api/migrate', { method: 'POST', key: DEPLOY_KEY })
    expect(first.status).toBe(200)
    expect(first.json).toEqual({ applied: [] })
    const second = await api('/api/migrate', { method: 'POST', key: DEPLOY_KEY })
    expect(second.json).toEqual({ applied: [] })
  })

  test('applies a migration whose record is missing, without losing data', async () => {
    const saved = await api('/api/state', {
      method: 'PUT',
      headers: { 'If-Match': '"0"' },
      body: { data: { keep: 'me' } },
    })
    expect(saved.status).toBe(200)

    sql("DELETE FROM schema_migrations WHERE name = '0001_init'")
    const res = await api('/api/migrate', { method: 'POST', key: DEPLOY_KEY })
    expect(res.json).toEqual({ applied: ['0001_init'] })

    const again = await api('/api/migrate', { method: 'POST', key: DEPLOY_KEY })
    expect(again.json).toEqual({ applied: [] })

    const read = await api('/api/state')
    expect(read.json.data).toEqual({ keep: 'me' })
    expect(read.json.version).toBe(1)
  })
})
