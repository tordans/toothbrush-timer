import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  api,
  BASE,
  clearPhotoFiles,
  clearThrottle,
  compose,
  createFamily,
  ISO_MS,
  resetAll,
  sql,
} from './helpers'

// Tiny real images: 8x6 pixels, made with sips (JPEG) and cwebp (WebP).
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAACKADAAQAAAABAAAABgAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgABgAIAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMADw8PDw8PGg8PGiQaGhokMSQkJCQxPjExMTExPks+Pj4+Pj5LS0tLS0tLS1paWlpaWmlpaWlpdnZ2dnZ2dnZ2dv/bAEMBEhMTHhweNBwcNHtURVR7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e//dAAQAAf/aAAwDAQACEQMRAD8AitNJi46Vo/2TF7VPadq0ayqVZ33HhK9T2a1P/9k=',
  'base64',
)
const WEBP = Buffer.from(
  'UklGRj4AAABXRUJQVlA4IDIAAADwAQCdASoIAAYABABoJbACdH8AGBTe9QAA/uYH7u0myJVFtu3W98Z1z1eRWDbkM/YAAA==',
  'base64',
)
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

/** The JPEG with a different size in its header (the pixel data is not touched). */
function jpegWithSize(width: number, height: number) {
  const copy = Buffer.from(JPEG)
  const sof = copy.indexOf(Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08]))
  copy.writeUInt16BE(height, sof + 5)
  copy.writeUInt16BE(width, sof + 7)
  return copy
}

let key = ''
let otherKey = ''

const upload = (body: BodyInit | null, type: string | null, k: string | null = key) =>
  fetch(`${BASE}/api/photos`, {
    method: 'POST',
    headers: {
      ...(type ? { 'Content-Type': type } : {}),
      ...(k ? { Authorization: `Bearer ${k}` } : {}),
    },
    body,
  }).then(async (response) => {
    const text = await response.text()
    let json: any = null
    try {
      json = JSON.parse(text)
    } catch {}
    return { status: response.status, headers: response.headers, json }
  })

const photoFile = (id: string, ext: string) => `/srv/brush/data/photos/${familyId()}/${id}.${ext}`
const familyId = () => Number(sql('SELECT id FROM families ORDER BY id LIMIT 1;').trim())

beforeAll(async () => {
  await resetAll()
  key = await createFamily()
  otherKey = await createFamily()
})

afterAll(clearThrottle)

describe('photos: auth and routing', () => {
  test.each([
    ['GET', '/api/photos'],
    ['POST', '/api/photos'],
    ['GET', '/api/photos/AAAAAAAAAAAAAAAAAAAAAA'],
    ['DELETE', '/api/photos/AAAAAAAAAAAAAAAAAAAAAA'],
  ])('%s %s without a key is 401', async (method, route) => {
    const res = await api(route, { method })
    expect(res.status).toBe(401)
    expect(res.json).toEqual({ error: 'unauthorized' })
  })

  test('a wrong key is 401', async () => {
    const res = await api('/api/photos', { key: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.json).toEqual({ error: 'unauthorized' })
  })

  test('wrong methods are 405 with Allow', async () => {
    const list = await api('/api/photos', { method: 'DELETE', key })
    expect(list.status).toBe(405)
    expect(list.headers.get('allow')).toBe('GET, POST')
    const one = await api('/api/photos/AAAAAAAAAAAAAAAAAAAAAA', { method: 'PUT', key })
    expect(one.status).toBe(405)
    expect(one.headers.get('allow')).toBe('GET, DELETE')
  })

  test('ids that are not 22 base64url characters are 404', async () => {
    for (const id of [
      'short',
      'AAAAAAAAAAAAAAAAAAAAAAA',
      'AAAAAAAAAAAAAAAAAAAA.A',
      '..',
      'AAAAAAAAAAAAAAAAAAAA%20A',
    ]) {
      const res = await api(`/api/photos/${id}`, { key })
      expect(res.status).toBe(404)
      expect(res.json).toEqual({ error: 'not_found' })
    }
  })

  test('an unknown but well-formed id is 404', async () => {
    expect((await api('/api/photos/AAAAAAAAAAAAAAAAAAAAAA', { key })).status).toBe(404)
    expect(
      (await api('/api/photos/AAAAAAAAAAAAAAAAAAAAAA', { method: 'DELETE', key })).status,
    ).toBe(404)
  })
})

describe('photos: upload, list, fetch, delete', () => {
  test('the list is empty at first and not cached', async () => {
    const res = await api('/api/photos', { key })
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ photos: [] })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  let jpegId = ''
  let webpId = ''

  test('a JPEG is stored', async () => {
    const res = await upload(JPEG, 'image/jpeg')
    expect(res.status).toBe(201)
    expect(Object.keys(res.json)).toEqual(['id', 'width', 'height', 'bytes', 'type', 'created_at'])
    expect(res.json.id).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(res.json).toMatchObject({ width: 8, height: 6, bytes: JPEG.length, type: 'image/jpeg' })
    expect(res.json.created_at).toMatch(ISO_MS)
    jpegId = res.json.id
  })

  test('a WebP is stored, a content type with parameters is fine', async () => {
    const res = await upload(WEBP, 'Image/WebP; foo=bar')
    expect(res.status).toBe(201)
    expect(res.json).toMatchObject({ width: 8, height: 6, bytes: WEBP.length, type: 'image/webp' })
    webpId = res.json.id
  })

  test('the list shows both, oldest first', async () => {
    const res = await api('/api/photos', { key })
    expect(res.status).toBe(200)
    expect(res.json.photos.map((p: any) => p.id)).toEqual([jpegId, webpId])
    expect(res.json.photos[0]).toMatchObject({ type: 'image/jpeg', bytes: JPEG.length })
    expect(res.json.photos[1]).toMatchObject({ type: 'image/webp', bytes: WEBP.length })
  })

  test('the files are on disk outside the web root, and data/ is closed', () => {
    expect(
      compose('web', ['ls', `/srv/brush/data/photos/${familyId()}`])
        .split('\n')
        .filter(Boolean)
        .toSorted(),
    ).toEqual([`${jpegId}.jpg`, `${webpId}.webp`].toSorted())
    expect(compose('web', ['cat', '/srv/brush/data/.htaccess'])).toBe('Require all denied\n')
  })

  test('the bytes come back unchanged with the right headers', async () => {
    for (const [id, bytes, type] of [
      [jpegId, JPEG, 'image/jpeg'],
      [webpId, WEBP, 'image/webp'],
    ] as const) {
      const res = await fetch(`${BASE}/api/photos/${id}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe(type)
      expect(res.headers.get('content-length')).toBe(String(bytes.length))
      expect(res.headers.get('cache-control')).toBe('private, max-age=31536000, immutable')
      // the .htaccess adds the same header, so Apache may join the two values
      expect(res.headers.get('x-content-type-options')).toMatch(/^nosniff(, nosniff)?$/)
      expect(res.headers.get('content-disposition')).toBe('inline')
      expect(Buffer.from(await res.arrayBuffer()).equals(bytes)).toBe(true)
    }
  })

  test('fetching needs the key', async () => {
    const res = await fetch(`${BASE}/api/photos/${jpegId}`)
    expect(res.status).toBe(401)
  })

  test('another family cannot see, fetch or delete the photo', async () => {
    expect((await api('/api/photos', { key: otherKey })).json).toEqual({ photos: [] })
    const get = await api(`/api/photos/${jpegId}`, { key: otherKey })
    expect(get.status).toBe(404)
    expect(get.json).toEqual({ error: 'not_found' })
    const del = await api(`/api/photos/${jpegId}`, { method: 'DELETE', key: otherKey })
    expect(del.status).toBe(404)
    expect(del.json).toEqual({ error: 'not_found' })
    // still there for the owner
    expect((await api('/api/photos', { key })).json.photos).toHaveLength(2)
  })

  test('the photos survive a key renewal', async () => {
    const renewed = await api('/api/family/key', { method: 'POST', key })
    expect(renewed.status).toBe(200)
    const newKey = renewed.json.key as string
    expect((await api('/api/photos', { key })).status).toBe(401)
    const list = await api('/api/photos', { key: newKey })
    expect(list.json.photos.map((p: any) => p.id)).toEqual([jpegId, webpId])
    const res = await fetch(`${BASE}/api/photos/${jpegId}`, {
      headers: { Authorization: `Bearer ${newKey}` },
    })
    expect(Buffer.from(await res.arrayBuffer()).equals(JPEG)).toBe(true)
    key = newKey
  })

  test('delete answers 204 without a body and removes row and file', async () => {
    const res = await fetch(`${BASE}/api/photos/${jpegId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key}` },
    })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    expect((await api(`/api/photos/${jpegId}`, { key })).status).toBe(404)
    expect((await api('/api/photos', { key })).json.photos.map((p: any) => p.id)).toEqual([webpId])
    expect(() => compose('web', ['test', '-e', photoFile(jpegId, 'jpg')])).toThrow()
    expect((await api(`/api/photos/${jpegId}`, { method: 'DELETE', key })).status).toBe(404)
  })

  test('deleting a family removes its rows', async () => {
    expect(sql('SELECT COUNT(*) FROM photos;').trim()).toBe('1')
    sql(`DELETE FROM families WHERE id <> ${familyId()};`)
    expect(sql('SELECT COUNT(*) FROM photos;').trim()).toBe('1')
    sql('DELETE FROM families;')
    expect(sql('SELECT COUNT(*) FROM photos;').trim()).toBe('0')
    // the files stay on disk (by design, see docs); the next tests count files
    clearPhotoFiles()
    key = await createFamily()
    otherKey = await createFamily()
  })
})

describe('photos: upload validation', () => {
  const count = () => sql('SELECT COUNT(*) FROM photos;').trim()

  test('other content types are 415', async () => {
    for (const type of ['image/png', 'application/json', 'text/plain', 'image/gif', null]) {
      const res = await upload(JPEG, type)
      expect(res.status).toBe(415)
      expect(res.json.error).toBe('unsupported_type')
    }
  })

  test('fake bytes with an image content type are 415', async () => {
    for (const type of ['image/jpeg', 'image/webp']) {
      for (const body of [
        Buffer.from('not an image at all'),
        Buffer.alloc(0),
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      ]) {
        const res = await upload(body, type)
        expect(res.status).toBe(415)
        expect(res.json.error).toBe('unsupported_type')
      }
    }
  })

  test('real image bytes of the other type are 415', async () => {
    expect((await upload(JPEG, 'image/webp')).status).toBe(415)
    expect((await upload(WEBP, 'image/jpeg')).status).toBe(415)
    expect((await upload(PNG, 'image/jpeg')).status).toBe(415)
  })

  test('a cut-off file is 415', async () => {
    expect((await upload(JPEG.subarray(0, 100), 'image/jpeg')).status).toBe(415)
    expect((await upload(WEBP.subarray(0, 10), 'image/webp')).status).toBe(415)
  })

  test('more than 4096 pixels on a side is 415, 4096 is fine', async () => {
    expect((await upload(jpegWithSize(4097, 100), 'image/jpeg')).status).toBe(415)
    expect((await upload(jpegWithSize(100, 5000), 'image/jpeg')).status).toBe(415)
    const ok = await upload(jpegWithSize(4096, 4096), 'image/jpeg')
    expect(ok.status).toBe(201)
    expect(ok.json).toMatchObject({ width: 4096, height: 4096 })
    await api(`/api/photos/${ok.json.id}`, { method: 'DELETE', key })
  })

  test('more than 3 MiB is 413, exactly 3 MiB gets past the size check', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(3 * 1024 * 1024)])
    const res = await upload(big, 'image/jpeg')
    expect(res.status).toBe(413)
    expect(res.json.error).toBe('too_large')
    // JPEG with junk after the end is still a valid JPEG for the header check
    const exact = Buffer.concat([JPEG, Buffer.alloc(3 * 1024 * 1024 - JPEG.length)])
    expect(exact.length).toBe(3 * 1024 * 1024)
    const ok = await upload(exact, 'image/jpeg')
    expect(ok.status).toBe(201)
    expect(ok.json.bytes).toBe(3 * 1024 * 1024)
    await api(`/api/photos/${ok.json.id}`, { method: 'DELETE', key })
  })

  test('nothing was stored by the failed uploads', () => {
    expect(count()).toBe('0')
    expect(compose('web', ['sh', '-c', 'find /srv/brush/data/photos -type f | wc -l']).trim()).toBe(
      '0',
    )
  })

  test('the limit of 300 photos per family is 409, other families are not affected', async () => {
    sql(
      `INSERT INTO photos (id, family_id, type, width, height, bytes, created_at)
       SELECT LPAD(seq, 22, 'a'), ${familyId()}, 'image/jpeg', 8, 6, 100, UTC_TIMESTAMP(3) FROM seq_1_to_300;`,
    )
    const res = await upload(JPEG, 'image/jpeg')
    expect(res.status).toBe(409)
    expect(res.json.error).toBe('too_many_photos')
    expect(sql('SELECT COUNT(*) FROM photos;').trim()).toBe('300')
    expect(compose('web', ['sh', '-c', 'find /srv/brush/data/photos -type f | wc -l']).trim()).toBe(
      '0',
    )
    expect((await upload(JPEG, 'image/jpeg', otherKey)).status).toBe(201)
    // one place frees up when a photo is deleted
    sql(`DELETE FROM photos WHERE id = '${'a'.repeat(21)}b' OR id = LPAD(1, 22, 'a');`)
    expect((await upload(JPEG, 'image/jpeg')).status).toBe(201)
  })
})

describe('photos: throttling', () => {
  test('wrong keys are counted like for /api/state: 429 after 20', async () => {
    for (let i = 0; i < 20; i++) await api('/api/photos', { key: `wrong-${i}` })
    expect((await api('/api/photos', { key: 'wrong-again' })).status).toBe(429)
    expect((await api('/api/photos', { key })).status).toBe(429)
    expect((await api('/api/state', { key })).status).toBe(429)
  })
})
