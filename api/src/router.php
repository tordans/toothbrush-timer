<?php
declare(strict_types=1);

function brush_handle_request(): void
{
    $start = hrtime(true);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

    // One line per request, written when the script ends. Only method, path, status, duration.
    register_shutdown_function(static function () use ($start, $method, $path): void {
        $ms = (int) round((hrtime(true) - $start) / 1e6);
        log_line(sprintf('%s %s %d %dms', $method, $path, http_response_code() ?: 200, $ms));
    });

    set_exception_handler(static function (Throwable $e): void {
        log_line('ERROR ' . get_class($e) . ': ' . $e->getMessage() . "\n" . $e->getTraceAsString());
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
        }
        echo '{"error":"internal"}';
    });

    $route = preg_replace('#^/api#', '', $path) ?? '';
    $route = rtrim($route, '/');
    $route = preg_replace('#^/index\.php#', '', $route) ?? $route;

    switch ($route) {
        case '/health':
            allow_methods(['GET']);
            handle_health();
        case '/state':
            allow_methods(['GET', 'PUT']);
            require_key('family_key_hash');
            $method === 'GET' ? handle_state_get() : handle_state_put();
            break;
        case '/migrate':
            allow_methods(['POST']);
            require_key('deploy_key_hash');
            respond(200, ['applied' => run_migrations(db())]);
        case '/mcp':
            allow_methods(['POST']);
            require_key('mcp_key_hash');
            handle_mcp();
        default:
            respond_error(404, 'not_found');
    }
}

function allow_methods(array $methods): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', $methods, true)) {
        respond_error(405, 'method_not_allowed', [], ['Allow' => implode(', ', $methods)]);
    }
}

function handle_health(): never
{
    $commit = (string) (brush_config()['commit'] ?? 'unknown');
    try {
        db()->query('SELECT 1');
        respond(200, ['ok' => true, 'commit' => $commit, 'db' => true]);
    } catch (PDOException $e) {
        log_line('ERROR health: database not reachable (' . $e->getCode() . ')');
        respond(503, ['ok' => false, 'commit' => $commit, 'db' => false]);
    }
}

function handle_state_get(): never
{
    respond_json(200, state_json(state_read(db())));
}

function handle_state_put(): never
{
    $ifMatchHeader = request_header('If-Match');
    if ($ifMatchHeader === null) {
        respond_error(428, 'precondition_required', ['message' => 'Send If-Match with the version you last read']);
    }
    $ifMatch = parse_if_match($ifMatchHeader);
    if ($ifMatch === null) {
        respond_error(400, 'bad_request', ['message' => 'If-Match must be a version number']);
    }
    $dataJson = state_data_from_body(read_body(BRUSH_MAX_DATA_BYTES + 4096));

    $result = state_write(db(), $ifMatch, $dataJson);
    if (!$result['ok']) {
        respond_json(409, state_json($result['state'], ['error' => 'conflict']));
    }
    respond(200, ['version' => $result['version'], 'updated_at' => $result['updated_at']]);
}
