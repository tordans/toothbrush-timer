import { z } from 'zod'

/**
 * The family's reward photos on the server (see docs/central-storage.md). Every request needs
 * the family key; the photos are never reachable by a plain URL.
 */

const photoSchema = z.object({
  id: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  type: z.string(),
  created_at: z.string(),
})
export type Photo = z.infer<typeof photoSchema>

const TIMEOUT_MS = 20_000
const UPLOAD_TIMEOUT_MS = 90_000

async function request(path: string, init: RequestInit, timeout = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(path, { ...init, signal: controller.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const auth = (key: string) => ({ Authorization: `Bearer ${key}` })

export async function listPhotos(key: string): Promise<Photo[] | null> {
  const res = await request('/api/photos', { headers: auth(key), cache: 'no-store' })
  if (!res?.ok) return null
  const body = z
    .object({ photos: z.array(photoSchema) })
    .safeParse(await res.json().catch(() => null))
  return body.success ? body.data.photos : null
}

export type UploadResult =
  | { kind: 'ok'; photo: Photo }
  | { kind: 'too_many' }
  | { kind: 'rejected' }
  | { kind: 'offline' }

export async function uploadPhoto(key: string, image: Blob): Promise<UploadResult> {
  const res = await request(
    '/api/photos',
    { method: 'POST', headers: { ...auth(key), 'Content-Type': image.type }, body: image },
    UPLOAD_TIMEOUT_MS,
  )
  if (!res) return { kind: 'offline' }
  if (res.status === 409) return { kind: 'too_many' }
  if (res.status === 413 || res.status === 415) return { kind: 'rejected' }
  if (!res.ok) return { kind: 'offline' }
  const body = photoSchema.safeParse(await res.json().catch(() => null))
  return body.success ? { kind: 'ok', photo: body.data } : { kind: 'offline' }
}

export async function deletePhoto(key: string, id: string): Promise<boolean> {
  const res = await request(`/api/photos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: auth(key),
  })
  return res?.status === 204 || res?.status === 404
}

// Object URLs of photos loaded in this session. Photos never change, so one load is enough;
// the browser's HTTP cache keeps them across reloads (Cache-Control: private, immutable).
const objectUrls = new Map<string, Promise<string | null>>()

/** A `blob:` URL for an <img>, or null when the photo cannot be loaded right now. */
export function photoUrl(key: string, id: string): Promise<string | null> {
  const cached = objectUrls.get(id)
  if (cached) return cached
  const loading = request(`/api/photos/${encodeURIComponent(id)}`, { headers: auth(key) }).then(
    async (res) => {
      if (!res?.ok) return null
      return URL.createObjectURL(await res.blob())
    },
  )
  objectUrls.set(id, loading)
  // A failed load may be retried later (offline now, online in a minute).
  void loading.then((url) => {
    if (!url) objectUrls.delete(id)
  })
  return loading
}
