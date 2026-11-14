import { beforeAll, describe, expect, test } from 'bun:test'
import { api, BASE, resetAll } from './helpers'

beforeAll(resetAll)

describe('health and unauthorized', () => {
  test('GET /api/health needs no key', async () => {
    const res = await api('/api/health', { key: null })
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ ok: true, commit: 'dev' })
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  test('state without a key is 401', async () => {
    const res = await api('/api/state', { key: null })
    expect(res.status).toBe(401)
    expect(res.json).toEqual({ error: 'unauthorized' })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  test('state with a wrong key is 401, also for PUT', async () => {
    expect((await api('/api/state', { key: 'nope' })).status).toBe(401)
    const put = await api('/api/state', {
      method: 'PUT',
      key: 'nope',
      headers: { 'If-Match': '"0"' },
      body: { data: {} },
    })
    expect(put.status).toBe(401)
  })

  test('unknown API route is a JSON 404', async () => {
    const res = await api('/api/nothing-here', { key: null })
    expect(res.status).toBe(404)
    expect(res.json).toEqual({ error: 'not_found' })
  })

  test('the removed endpoints are gone', async () => {
    for (const route of ['/api/migrate', '/api/mcp']) {
      for (const method of ['GET', 'POST']) {
        const res = await api(route, { method, key: 'whatever' })
        expect(res.status).toBe(404)
        expect(res.json).toEqual({ error: 'not_found' })
      }
    }
  })

  test('wrong method is 405', async () => {
    const res = await api('/api/health', { method: 'POST', key: null })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('GET')
  })

  test('no CORS headers', async () => {
    const res = await api('/api/health', { key: null, headers: { Origin: 'https://example.com' } })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('.htaccess routing', () => {
  test('/ serves index.html and always revalidates', async () => {
    const res = await api('/', { key: null })
    expect(res.status).toBe(200)
    expect(res.text).toContain('placeholder-index')
    expect(res.headers.get('cache-control')).toBe('no-cache')
  })

  test('unknown path falls back to index.html (SPA)', async () => {
    const res = await api('/some/path', { key: null })
    expect(res.status).toBe(200)
    expect(res.text).toContain('placeholder-index')
  })

  test('existing asset is served and cached for a year', async () => {
    const res = await api('/assets/app-abc123.js', { key: null })
    expect(res.status).toBe(200)
    expect(res.text).toContain('console.log')
    expect(res.headers.get('content-type')).toContain('javascript')
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  test('missing asset is a real 404, not index.html', async () => {
    const res = await api('/assets/x.js', { key: null })
    expect(res.status).toBe(404)
    expect(res.text).not.toContain('placeholder-index')
  })

  test.each([
    '/.env',
    '/.htaccess',
    '/.ftp-deploy-sync-state.json',
    '/assets/.git/config',
    '/.git/HEAD',
  ])('dotfile %s is not served', async (route) => {
    const res = await api(route, { key: null })
    expect([403, 404]).toContain(res.status)
    expect(res.text).not.toContain('RewriteEngine')
  })

  test('server files are not reachable', async () => {
    for (const route of ['/config/config.php', '/api/src/bootstrap.php', '/logs/api.log']) {
      const res = await api(route, { key: null })
      expect(res.text).not.toContain('invite_sha256')
      expect(res.text).not.toContain('<?php')
    }
  })

  test('security headers are set', async () => {
    const res = await api('/', { key: null })
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    expect(res.headers.get('strict-transport-security')).toContain('max-age=')
  })

  test('http on localhost is not redirected', async () => {
    const res = await fetch(`${BASE}/`, { redirect: 'manual' })
    expect(res.status).toBe(200)
  })
})
