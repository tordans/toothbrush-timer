import { z } from 'zod'

const stateResponse = z.object({
  data: z.unknown().nullable(),
  version: z.number().int(),
  updated_at: z.string().nullable(),
})

export type RemoteState = { data: unknown; version: number }

export type ApiResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'conflict'; remote: RemoteState }
  | { kind: 'unauthorized' }
  | { kind: 'offline' }

const TIMEOUT_MS = 10_000

async function request(path: string, init: RequestInit): Promise<Response | null> {
  // AbortSignal.timeout() is too new for the old Android Chrome.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(path, { ...init, signal: controller.signal, cache: 'no-store' })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchRemoteState(key: string): Promise<ApiResult<RemoteState>> {
  const res = await request('/api/state', { headers: { Authorization: `Bearer ${key}` } })
  if (!res) return { kind: 'offline' }
  if (res.status === 401) return { kind: 'unauthorized' }
  if (!res.ok) return { kind: 'offline' }
  const parsed = stateResponse.safeParse(await res.json().catch(() => null))
  if (!parsed.success) return { kind: 'offline' }
  return { kind: 'ok', value: { data: parsed.data.data, version: parsed.data.version } }
}

export async function pushRemoteState(
  key: string,
  data: unknown,
  ifMatch: number,
): Promise<ApiResult<{ version: number }>> {
  const res = await request('/api/state', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'If-Match': `"${ifMatch}"`,
    },
    body: JSON.stringify({ data }),
  })
  if (!res) return { kind: 'offline' }
  if (res.status === 401) return { kind: 'unauthorized' }
  if (res.status === 409) {
    const parsed = stateResponse.safeParse(await res.json().catch(() => null))
    if (!parsed.success) return { kind: 'offline' }
    return { kind: 'conflict', remote: { data: parsed.data.data, version: parsed.data.version } }
  }
  if (!res.ok) return { kind: 'offline' }
  const body = z.object({ version: z.number().int() }).safeParse(await res.json().catch(() => null))
  if (!body.success) return { kind: 'offline' }
  return { kind: 'ok', value: { version: body.data.version } }
}
