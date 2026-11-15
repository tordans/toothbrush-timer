// Shared helpers for the API tests. They run against the Docker stack from compose.yml.
import path from 'node:path'

// Port 8088 unless BRUSH_API_PORT says otherwise (it must match the one the stack was started with)
export const BASE = `http://localhost:${process.env.BRUSH_API_PORT ?? 8088}`
export const INVITE = 'dev-invite'

export const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
export const KEY_FORMAT = /^[A-Za-z0-9_-]{43}$/

const composeFile = path.join(import.meta.dir, 'compose.yml')

export async function api(
  route: string,
  init: Omit<RequestInit, 'body'> & { body?: unknown; key?: string | null } = {},
) {
  const { body, key = null, headers, ...rest } = init
  const allHeaders = new Headers(headers)
  if (key) allHeaders.set('Authorization', `Bearer ${key}`)
  if (body !== undefined) allHeaders.set('Content-Type', 'application/json')
  const response = await fetch(`${BASE}${route}`, {
    redirect: 'manual',
    ...rest,
    headers: allHeaders,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  const text = await response.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    // not JSON (static files, Apache error pages)
  }
  return { status: response.status, headers: response.headers, text, json }
}

export function compose(service: 'db' | 'web', command: string[]) {
  const result = Bun.spawnSync([
    'docker',
    'compose',
    '-f',
    composeFile,
    'exec',
    '-T',
    service,
    ...command,
  ])
  if (result.exitCode !== 0) {
    throw new Error(`docker compose exec failed: ${result.stderr.toString()}`)
  }
  return result.stdout.toString()
}

/** Runs SQL as the app user inside the database container. */
export function sql(statement: string) {
  return compose('db', ['mariadb', '-ubrush', '-pbrush-dev', 'brush', '-N', '-B', '-e', statement])
}

export const sha256 = (text: string) => new Bun.CryptoHasher('sha256').update(text).digest('hex')

/** Forget failed key attempts of the test client (the file based throttle). */
export function clearThrottle() {
  compose('web', ['rm', '-rf', '/srv/brush/logs/throttle'])
}

/** Remove all stored photo files (the rows go with their families). */
export function clearPhotoFiles() {
  compose('web', ['rm', '-rf', '/srv/brush/data'])
}

/**
 * Empty slate: no families, no invite attempts, no throttle, no photo files. The warm-up request makes the API
 * create the tables first if the stack is brand new.
 */
export async function resetAll() {
  await api('/api/state', { key: 'warm-up' })
  sql('DELETE FROM invite_attempts; DELETE FROM families;')
  clearThrottle()
  clearPhotoFiles()
}

export const createFamilyRequest = (invite: unknown = INVITE) =>
  api('/api/families', { method: 'POST', body: { invite } })

/** Creates a family with the right invite word and returns its key. */
export async function createFamily(): Promise<string> {
  const res = await createFamilyRequest()
  if (res.status !== 201) throw new Error(`create family failed: ${res.status} ${res.text}`)
  return res.json.key as string
}
