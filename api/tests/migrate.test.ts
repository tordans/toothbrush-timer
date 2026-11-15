import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { api, clearThrottle, createFamily, createFamilyRequest, resetAll, sql } from './helpers'

// The API creates its tables itself, on the first request that needs the database.
const dropTables = () =>
  sql('DROP TABLE IF EXISTS photos, families, invite_attempts, schema_migrations')
const tables = () =>
  sql(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'brush' ORDER BY table_name",
  )
    .trim()
    .split('\n')
    .filter(Boolean)

beforeAll(resetAll)
afterAll(async () => {
  await resetAll()
  clearThrottle()
})

describe('the API migrates itself', () => {
  test('a fresh database: the first request that needs it creates everything', async () => {
    dropTables()
    expect(tables()).toEqual([])

    // A wrong invite word touches the database (and counts one failed attempt).
    const res = await createFamilyRequest('wrong')
    expect(res.status).toBe(403)
    expect(res.json).toEqual({ error: 'invalid_invite' })

    expect(tables()).toEqual(['families', 'invite_attempts', 'photos', 'schema_migrations'])
    expect(sql('SELECT name FROM schema_migrations').trim()).toBe('0001_init\n0002_photos')
  })

  test('works from the first request on: create a family on a fresh database', async () => {
    dropTables()
    const key = await createFamily()
    const read = await api('/api/state', { key })
    expect(read.json).toEqual({ data: null, version: 0, updated_at: null })
  })

  test('a state request with a key also migrates (and answers 401)', async () => {
    dropTables()
    const res = await api('/api/state', { key: 'unknown-key' })
    expect(res.status).toBe(401)
    expect(tables()).toEqual(['families', 'invite_attempts', 'photos', 'schema_migrations'])
    clearThrottle()
  })

  test('requests that arrive together on a fresh database all succeed', async () => {
    dropTables()
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => createFamilyRequest(`wrong-${i}`)),
    )
    expect(results.map((r) => r.status)).toEqual(Array(10).fill(403))
    expect(tables()).toEqual(['families', 'invite_attempts', 'photos', 'schema_migrations'])
    expect(sql('SELECT COUNT(*) FROM schema_migrations').trim()).toBe('2')
  })

  test('nothing pending: a request changes nothing', async () => {
    await resetAll()
    const before = sql('SELECT name, applied_at FROM schema_migrations')
    await createFamilyRequest('wrong')
    expect(sql('SELECT name, applied_at FROM schema_migrations')).toBe(before)
  })

  test('a migration whose record is missing is applied again without losing data', async () => {
    await resetAll()
    const key = await createFamily()
    const saved = await api('/api/state', {
      method: 'PUT',
      key,
      headers: { 'If-Match': '"0"' },
      body: { data: { keep: 'me' } },
    })
    expect(saved.status).toBe(200)

    sql("DELETE FROM schema_migrations WHERE name = '0001_init'")
    const read = await api('/api/state', { key })
    expect(read.status).toBe(200)
    expect(read.json.data).toEqual({ keep: 'me' })
    expect(read.json.version).toBe(1)
    expect(sql('SELECT name FROM schema_migrations').trim()).toBe('0001_init\n0002_photos')
  })

  test('the photos migration can run twice without losing rows', async () => {
    await resetAll()
    const key = await createFamily()
    sql(
      `INSERT INTO photos (id, family_id, type, width, height, bytes, created_at)
       SELECT 'aaaaaaaaaaaaaaaaaaaaaa', id, 'image/jpeg', 8, 6, 100, UTC_TIMESTAMP(3) FROM families;`,
    )
    sql("DELETE FROM schema_migrations WHERE name = '0002_photos'")
    const list = await api('/api/photos', { key })
    expect(list.status).toBe(200)
    expect(list.json.photos).toHaveLength(1)
    expect(sql('SELECT name FROM schema_migrations').trim()).toBe('0001_init\n0002_photos')
  })
})
