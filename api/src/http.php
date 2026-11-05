<?php
declare(strict_types=1);

function brush_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require BRUSH_ROOT . '/config/config.php';
    }
    return $config;
}

/** Current time as ISO string in UTC with milliseconds. */
function iso_now(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
}

/** DATETIME(3) value (UTC) from the database to ISO. */
function iso_from_db(string $value): string
{
    $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s.u', $value, new DateTimeZone('UTC'))
        ?: DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value, new DateTimeZone('UTC'));
    return $dt ? $dt->format('Y-m-d\TH:i:s.v\Z') : $value;
}

function log_file(): string
{
    return BRUSH_ROOT . '/logs/api.log';
}

/** Appends one line to our own log. Never pass keys in here. */
function log_line(string $line): void
{
    $file = log_file();
    $dir = dirname($file);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    if (is_file($file) && filesize($file) > 2 * 1024 * 1024) {
        @rename($file, $file . '.1');
    }
    @file_put_contents($file, iso_now() . ' ' . $line . "\n", FILE_APPEND | LOCK_EX);
}

function request_header(string $name): ?string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    $value = $_SERVER[$key] ?? null;
    if ($value === null && $name === 'Authorization') {
        $value = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
        if ($value === null && function_exists('getallheaders')) {
            foreach (getallheaders() as $k => $v) {
                if (strcasecmp($k, 'Authorization') === 0) {
                    $value = $v;
                }
            }
        }
    }
    return is_string($value) ? $value : null;
}

/** Sends a JSON response from an already encoded JSON string, then stops. */
function respond_json(int $status, string $json, array $headers = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    foreach ($headers as $name => $value) {
        header($name . ': ' . $value);
    }
    echo $json;
    exit;
}

function json_encode_api(mixed $value): string
{
    return json_encode(
        $value,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR,
    );
}

function respond(int $status, mixed $body, array $headers = []): never
{
    respond_json($status, json_encode_api($body), $headers);
}

function respond_error(int $status, string $error, array $extra = [], array $headers = []): never
{
    respond($status, ['error' => $error] + $extra, $headers);
}

/** Reads the request body, at most $max bytes; null if it is larger. */
function read_body(int $max): ?string
{
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $max) {
        return null;
    }
    $body = file_get_contents('php://input', false, null, 0, $max + 1);
    if ($body === false || strlen($body) > $max) {
        return null;
    }
    return $body;
}
