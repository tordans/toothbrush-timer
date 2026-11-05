import { beforeAll, describe, expect, test } from 'bun:test'
import { api, clearThrottle, FAMILY_KEY, MCP_KEY, resetState } from './helpers'

let nextId = 1
async function rpc(method: string, params?: unknown) {
  const res = await api('/api/mcp', {
    method: 'POST',
    key: MCP_KEY,
    body: { jsonrpc: '2.0', id: nextId++, method, params },
  })
  return res
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const res = await rpc('tools/call', { name, arguments: args })
  expect(res.status).toBe(200)
  const result = res.json.result
  return { isError: result.isError === true, text: result.content[0].text as string }
}

beforeAll(() => {
  clearThrottle()
  resetState()
})

describe('mcp', () => {
  test('needs the mcp key', async () => {
    const body = { jsonrpc: '2.0', id: 1, method: 'ping' }
    expect((await api('/api/mcp', { method: 'POST', key: null, body })).status).toBe(401)
    expect((await api('/api/mcp', { method: 'POST', key: FAMILY_KEY, body })).status).toBe(401)
  })

  test('the mcp key does not open the state endpoint', async () => {
    expect((await api('/api/state', { key: MCP_KEY })).status).toBe(401)
  })

  test('initialize', async () => {
    const res = await rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    })
    expect(res.status).toBe(200)
    expect(res.json.result.protocolVersion).toBe('2025-03-26')
    expect(res.json.result.capabilities.tools).toBeDefined()
    expect(res.json.result.serverInfo.name).toBeString()
  })

  test('a notification gets 202 and no body', async () => {
    const res = await api('/api/mcp', {
      method: 'POST',
      key: MCP_KEY,
      body: { jsonrpc: '2.0', method: 'notifications/initialized' },
    })
    expect(res.status).toBe(202)
    expect(res.text).toBe('')
  })

  test('tools/list', async () => {
    const res = await rpc('tools/list')
    const names = res.json.result.tools.map((t: { name: string }) => t.name)
    expect(names).toEqual(['status', 'read_log', 'query', 'get_state', 'put_state', 'migrate'])
    for (const tool of res.json.result.tools) {
      expect(tool.inputSchema.type).toBe('object')
    }
  })

  test('unknown method and unknown tool', async () => {
    expect((await rpc('nope')).json.error.code).toBe(-32601)
    expect((await rpc('tools/call', { name: 'rm_rf', arguments: {} })).json.error.code).toBe(-32602)
  })

  test('garbage body is a parse error', async () => {
    const res = await api('/api/mcp', { method: 'POST', key: MCP_KEY, body: 'not json' })
    expect(res.json.error.code).toBe(-32700)
  })

  test('get_state', async () => {
    const tool = await callTool('get_state')
    expect(tool.isError).toBe(false)
    expect(JSON.parse(tool.text)).toEqual({ data: null, version: 0, updated_at: null })
  })

  test('put_state needs the right version, keeps empty objects', async () => {
    const ok = await callTool('put_state', { data: { a: {}, b: [] }, if_match: 0 })
    expect(ok.isError).toBe(false)
    expect(JSON.parse(ok.text).version).toBe(1)

    const stale = await callTool('put_state', { data: { a: 1 }, if_match: 0 })
    expect(JSON.parse(stale.text).conflict).toBe(true)

    const bad = await callTool('put_state', { data: [1], if_match: 1 })
    expect(bad.isError).toBe(true)

    const read = await api('/api/state')
    expect(read.text).toContain('"a":{}')
    expect(read.json.version).toBe(1)
  })

  test('status', async () => {
    const tool = await callTool('status')
    const status = JSON.parse(tool.text)
    expect(status.php).toStartWith('8.4')
    expect(status.extensions).toContain('pdo_mysql')
    expect(status.commit).toBe('dev')
    expect(status.db).toBe(true)
    expect(status.schema_version).toBe('0001_init')
    expect(status.pending_migrations).toBe(0)
  })

  test('read_log shows requests without keys', async () => {
    await api('/api/health', { key: null })
    const tool = await callTool('read_log', { lines: 50, filter: 'GET /api/health' })
    expect(tool.text).toContain('GET /api/health 200')
    expect(tool.text).toMatch(/\d+ms/)
    const all = await callTool('read_log', { lines: 1000 })
    expect(all.text).not.toContain('dev-family-key')
    expect(all.text).not.toContain('dev-mcp-key')
  })

  test('query: SELECT works and is limited', async () => {
    const tool = await callTool('query', { sql: 'SELECT id, version FROM state' })
    expect(tool.isError).toBe(false)
    expect(JSON.parse(tool.text).rows).toEqual([{ id: 1, version: 1 }])

    const many = await callTool('query', {
      sql: 'SELECT seq FROM seq_1_to_500', // MariaDB sequence engine
    })
    const parsed = JSON.parse(many.text)
    expect(parsed.rows).toHaveLength(200)
    expect(parsed.truncated).toBe(true)
  })

  test.each([
    'DELETE FROM state',
    'UPDATE state SET version = 99',
    'SELECT 1; DROP TABLE state',
    'DROP TABLE state',
    "SELECT * FROM state INTO OUTFILE '/tmp/x'",
    'SELECT SLEEP(10)',
    'SELECT 1 /* hi */',
    '',
  ])('query refuses %p', async (sqlText) => {
    const tool = await callTool('query', { sql: sqlText })
    expect(tool.isError).toBe(true)
    expect((await api('/api/state')).json.version).toBe(1)
  })

  test('migrate tool', async () => {
    const tool = await callTool('migrate')
    expect(JSON.parse(tool.text)).toEqual({ applied: [] })
  })
})
