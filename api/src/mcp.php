<?php
// Minimal stateless MCP endpoint (JSON-RPC 2.0 over HTTP POST, JSON responses only).
declare(strict_types=1);

const MCP_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MCP_QUERY_MAX_ROWS = 200;

function handle_mcp(): never
{
    $raw = read_body(BRUSH_MAX_DATA_BYTES + 4096);
    // Objects stay stdClass so that an empty {} inside put_state data is not turned into [].
    $message = $raw === null ? null : json_decode($raw, false, 64);

    if (is_array($message) && $message !== []) { // batch
        $responses = [];
        foreach ($message as $item) {
            $response = $item instanceof stdClass ? mcp_dispatch((array) $item) : mcp_error(null, -32600, 'Invalid Request');
            if ($response !== null) {
                $responses[] = $response;
            }
        }
        $responses === [] ? respond_json(202, '') : respond(200, $responses);
    }
    if (!($message instanceof stdClass)) {
        respond(200, mcp_error(null, is_array($message) ? -32600 : -32700, is_array($message) ? 'Invalid Request' : 'Parse error'));
    }

    $response = mcp_dispatch((array) $message);
    $response === null ? respond_json(202, '') : respond(200, $response);
}

function mcp_error(mixed $id, int $code, string $message): array
{
    return ['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => $code, 'message' => $message]];
}

/** Returns the response array, or null for notifications. */
function mcp_dispatch(array $request): ?array
{
    $hasId = array_key_exists('id', $request);
    $id = $request['id'] ?? null;
    $method = $request['method'] ?? null;
    if (!is_string($method)) {
        return mcp_error($id, -32600, 'Invalid Request');
    }
    if (!$hasId) {
        return null; // notification, e.g. notifications/initialized
    }
    $params = ($request['params'] ?? null) instanceof stdClass ? (array) $request['params'] : [];

    switch ($method) {
        case 'initialize':
            $wanted = (string) ($params['protocolVersion'] ?? '');
            $version = in_array($wanted, MCP_PROTOCOL_VERSIONS, true) ? $wanted : MCP_PROTOCOL_VERSIONS[0];
            return mcp_result($id, [
                'protocolVersion' => $version,
                'capabilities' => ['tools' => new stdClass()],
                'serverInfo' => ['name' => 'brushing-sparks-api', 'version' => '1.0.0'],
            ]);
        case 'ping':
            return mcp_result($id, new stdClass());
        case 'tools/list':
            return mcp_result($id, ['tools' => mcp_tools()]);
        case 'tools/call':
            $name = (string) ($params['name'] ?? '');
            $arguments = ($params['arguments'] ?? null) instanceof stdClass ? (array) $params['arguments'] : [];
            if (!in_array($name, array_column(mcp_tools(), 'name'), true)) {
                return mcp_error($id, -32602, 'Unknown tool: ' . $name);
            }
            try {
                return mcp_result($id, mcp_text(mcp_call_tool($name, $arguments)));
            } catch (InvalidArgumentException $e) {
                return mcp_result($id, mcp_text($e->getMessage(), true));
            } catch (Throwable $e) {
                log_line('ERROR mcp ' . $name . ': ' . get_class($e) . ': ' . $e->getMessage());
                return mcp_result($id, mcp_text('Tool failed: ' . get_class($e), true));
            }
        default:
            return mcp_error($id, -32601, 'Method not found');
    }
}

function mcp_result(mixed $id, mixed $result): array
{
    return ['jsonrpc' => '2.0', 'id' => $id, 'result' => $result];
}

function mcp_text(mixed $value, bool $isError = false): array
{
    $text = is_string($value)
        ? $value
        : json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
    $result = ['content' => [['type' => 'text', 'text' => (string) $text]]];
    if ($isError) {
        $result['isError'] = true;
    }
    return $result;
}

function mcp_write_allowed(): bool
{
    return (brush_config()['mcp_allow_write'] ?? false) === true;
}

function mcp_tools(): array
{
    $empty = ['type' => 'object', 'properties' => new stdClass()];
    $tools = [
        [
            'name' => 'status',
            'description' => 'PHP version, extensions, deployed commit, schema version, database reachability and disk use.',
            'inputSchema' => $empty,
        ],
        [
            'name' => 'read_log',
            'description' => 'Last lines of the API log (method, path, status, duration; errors with stack trace).',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'lines' => ['type' => 'integer', 'description' => 'How many lines (default 100, max 1000)'],
                    'filter' => ['type' => 'string', 'description' => 'Only lines containing this text'],
                ],
            ],
        ],
        [
            'name' => 'query',
            'description' => 'Read-only SQL (one SELECT statement, at most ' . MCP_QUERY_MAX_ROWS . ' rows) on the tables state and schema_migrations.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => ['sql' => ['type' => 'string']],
                'required' => ['sql'],
            ],
        ],
        [
            'name' => 'get_state',
            'description' => 'The current shared state document with version and updated_at.',
            'inputSchema' => $empty,
        ],
    ];
    if (mcp_write_allowed()) {
        $tools[] = [
            'name' => 'put_state',
            'description' => 'Replace the state document. Needs the version you read (if_match), like the HTTP API.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'data' => ['type' => 'object'],
                    'if_match' => ['type' => 'integer', 'description' => 'Current version'],
                ],
                'required' => ['data', 'if_match'],
            ],
        ];
        $tools[] = [
            'name' => 'migrate',
            'description' => 'Apply pending database migrations.',
            'inputSchema' => $empty,
        ];
    }
    return $tools;
}

function mcp_call_tool(string $name, array $args): mixed
{
    switch ($name) {
        case 'status':
            return mcp_status();
        case 'read_log':
            $lines = max(1, min(1000, (int) ($args['lines'] ?? 100)));
            $filter = isset($args['filter']) && is_string($args['filter']) ? $args['filter'] : null;
            return mcp_read_log($lines, $filter);
        case 'query':
            return mcp_query((string) ($args['sql'] ?? ''));
        case 'get_state':
            return state_json(state_read(db()));
        case 'put_state':
            if (!mcp_write_allowed()) {
                throw new InvalidArgumentException('Write tools are disabled (mcp_allow_write is false)');
            }
            if (!is_int($args['if_match'] ?? null)) {
                throw new InvalidArgumentException('if_match (integer) is required');
            }
            $data = $args['data'] ?? null;
            if (!($data instanceof stdClass)) {
                throw new InvalidArgumentException('data must be an object');
            }
            $json = json_encode_api($data);
            if (strlen($json) > BRUSH_MAX_DATA_BYTES) {
                throw new InvalidArgumentException('data is larger than 256 KiB');
            }
            $result = state_write(db(), $args['if_match'], $json);
            return $result['ok']
                ? ['version' => $result['version'], 'updated_at' => $result['updated_at']]
                : ['conflict' => true, 'current' => json_decode(state_json($result['state']))];
        case 'migrate':
            if (!mcp_write_allowed()) {
                throw new InvalidArgumentException('Write tools are disabled (mcp_allow_write is false)');
            }
            return ['applied' => run_migrations(db())];
    }
    throw new InvalidArgumentException('Unknown tool');
}

function mcp_dir_size(string $dir): int
{
    if (!is_dir($dir)) {
        return 0;
    }
    $size = 0;
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $file) {
        $size += $file->isFile() ? $file->getSize() : 0;
    }
    return $size;
}

function mcp_status(): array
{
    $status = [
        'php' => PHP_VERSION,
        'extensions' => get_loaded_extensions(),
        'commit' => brush_config()['commit'] ?? 'unknown',
        'mcp_allow_write' => mcp_write_allowed(),
        'disk_bytes' => [],
    ];
    foreach (['public', 'api', 'config', 'logs'] as $folder) {
        $status['disk_bytes'][$folder] = mcp_dir_size(BRUSH_ROOT . '/' . $folder);
    }
    try {
        $pdo = db();
        $pdo->query('SELECT 1');
        $status['db'] = true;
        $status['db_version'] = $pdo->query('SELECT VERSION()')->fetchColumn();
        $applied = applied_migrations($pdo);
        $status['schema_version'] = $applied === [] ? null : end($applied);
        $status['pending_migrations'] = count(migration_files()) - count($applied);
    } catch (Throwable $e) {
        $status['db'] = false;
        $status['db_error'] = get_class($e);
    }
    return $status;
}

function mcp_read_log(int $lines, ?string $filter): string
{
    $file = log_file();
    if (!is_file($file)) {
        return '(no log yet)';
    }
    $size = filesize($file);
    $handle = fopen($file, 'rb');
    if ($handle === false) {
        throw new RuntimeException('log not readable');
    }
    fseek($handle, max(0, $size - 512 * 1024));
    $content = (string) stream_get_contents($handle);
    fclose($handle);
    $all = explode("\n", rtrim($content, "\n"));
    if ($size > 512 * 1024) {
        array_shift($all); // first line is probably cut
    }
    if ($filter !== null && $filter !== '') {
        $all = array_values(array_filter($all, static fn (string $l): bool => str_contains($l, $filter)));
    }
    return implode("\n", array_slice($all, -$lines));
}

function mcp_query(string $sql): array
{
    $sql = trim($sql);
    $sql = rtrim($sql, "; \t\n\r");
    // Comments could hide a second statement or a keyword from the checks below.
    if ($sql === '' || str_contains($sql, ';') || preg_match('~--|/\*|#~', $sql)) {
        throw new InvalidArgumentException('Send exactly one SELECT statement without comments or ";"');
    }
    if (!preg_match('/^select\b/i', $sql) || preg_match('/\b(into|sleep|benchmark|load_file|get_lock|for\s+update|lock\s+in\s+share)\b/i', $sql)) {
        throw new InvalidArgumentException('Only plain SELECT statements are allowed');
    }
    $pdo = db();
    $pdo->exec('START TRANSACTION READ ONLY'); // the server refuses writes even if a check above is bypassed
    try {
        $stmt = $pdo->query($sql);
        $rows = [];
        $truncated = false;
        while (($row = $stmt->fetch()) !== false) {
            if (count($rows) >= MCP_QUERY_MAX_ROWS) {
                $truncated = true;
                break;
            }
            $rows[] = $row;
        }
        $stmt->closeCursor();
        return ['rows' => $rows, 'row_count' => count($rows), 'truncated' => $truncated];
    } finally {
        $pdo->exec('ROLLBACK');
    }
}
