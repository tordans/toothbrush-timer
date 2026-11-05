// Shared helpers for the API tests. They run against the Docker stack from compose.yml.
import path from 'node:path'

export const BASE = 'http://localhost:8088'
export const FAMILY_KEY = 'dev-family-key'
export const DEPLOY_KEY = 'dev-deploy-key'
export const MCP_KEY = 'dev-mcp-key'

export const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

const composeFile = path.join(import.meta.dir, 'compose.yml')

export async function api(
  route: string,
  init: Omit<RequestInit, 'body'> & { body?: unknown; key?: string | null } = {},
) {
  const { body, key = FAMILY_KEY, headers, ...rest } = init
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

function compose(service: 'db' | 'web', command: string[]) {
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

/** Back to "never saved". */
export function resetState() {
  sql("UPDATE state SET data = 'null', version = 0 WHERE id = 1")
}

/** Forget failed login attempts of the test client. */
export function clearThrottle() {
  compose('web', ['rm', '-rf', '/srv/brush/logs/throttle'])
}
