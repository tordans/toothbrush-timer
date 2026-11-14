import { afterAll, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { api, resetAll, sql } from './helpers'

const composeFile = path.join(import.meta.dir, 'compose.yml')
const docker = (...args: string[]) =>
  Bun.spawnSync(['docker', 'compose', '-f', composeFile, ...args], { stderr: 'pipe' })

function startDb() {
  docker('start', 'db')
  for (let i = 0; i < 60; i++) {
    try {
      sql('SELECT 1')
      return
    } catch {
      Bun.sleepSync(1000)
    }
  }
  throw new Error('database did not come back')
}

afterAll(async () => {
  startDb()
  await resetAll()
})

describe('health does not touch the database', () => {
  test('with the database stopped: health is 200, routes that need it are 500', async () => {
    docker('stop', 'db')

    const health = await api('/api/health')
    expect(health.status).toBe(200)
    expect(health.json).toEqual({ ok: true, commit: 'dev' })

    expect((await api('/api/nothing-here')).status).toBe(404)
    // no key: 401 without a database lookup
    expect((await api('/api/state')).status).toBe(401)

    const create = await api('/api/families', { method: 'POST', body: { invite: 'dev-invite' } })
    expect(create.status).toBe(500)
    expect(create.json).toEqual({ error: 'internal' })
  })

  test('after the database is back, everything works again', async () => {
    startDb()
    expect((await api('/api/health')).status).toBe(200)
    await resetAll()
    const create = await api('/api/families', { method: 'POST', body: { invite: 'dev-invite' } })
    expect(create.status).toBe(201)
  })
})
