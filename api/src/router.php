<?php
declare(strict_types=1);

function brush_handle_request(): void
{
    $start = hrtime(true);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

    // Only server errors are logged (method, path, status, duration; never request content or IP).
    // Normal requests already appear in the hoster's access log.
    register_shutdown_function(static function () use ($start, $method, $path): void {
        $status = http_response_code() ?: 200;
        if ($status < 500) {
            return;
        }
        $ms = (int) round((hrtime(true) - $start) / 1e6);
        log_line(sprintf('%s %s %d %dms', $method, $path, $status, $ms));
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
            // No database access here: health must answer even when the database is down.
            allow_methods(['GET']);
            respond(200, ['ok' => true, 'commit' => (string) (brush_config()['commit'] ?? 'unknown')]);
        case '/families':
            allow_methods(['POST']);
            handle_families_create();
        case '/state':
            allow_methods(['GET', 'PUT']);
            $family = require_family();
            $method === 'GET' ? handle_state_get($family) : handle_state_put($family);
        case '/family/key':
            allow_methods(['POST']);
            handle_family_key_renew(require_family());
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

function handle_state_get(array $family): never
{
    $state = state_read(db(), $family['id']) ?? respond_error(401, 'unauthorized');
    respond_json(200, state_json($state));
}

function handle_state_put(array $family): never
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

    $result = state_write(db(), $family['id'], $ifMatch, $dataJson) ?? respond_error(401, 'unauthorized');
    if (!$result['ok']) {
        respond_json(409, state_json($result['state'], ['error' => 'conflict']));
    }
    respond(200, ['version' => $result['version'], 'updated_at' => $result['updated_at']]);
}
