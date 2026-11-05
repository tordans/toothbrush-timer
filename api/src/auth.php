<?php
declare(strict_types=1);

const BRUSH_THROTTLE_MAX = 20;      // failed attempts ...
const BRUSH_THROTTLE_WINDOW = 600;  // ... within this many seconds block the IP

function bearer_token(): ?string
{
    $header = request_header('Authorization');
    if ($header === null || !preg_match('/^Bearer\s+(\S{1,512})\s*$/i', $header, $m)) {
        return null;
    }
    return $m[1];
}

function throttle_file(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return BRUSH_ROOT . '/logs/throttle/' . hash('sha256', $ip) . '.txt';
}

/** Timestamps of recent failures from this IP. */
function throttle_recent(): array
{
    $file = throttle_file();
    if (!is_file($file)) {
        return [];
    }
    $cutoff = time() - BRUSH_THROTTLE_WINDOW;
    $times = array_map('intval', file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []);
    return array_values(array_filter($times, static fn (int $t): bool => $t > $cutoff));
}

function throttle_register_failure(): void
{
    $file = throttle_file();
    $dir = dirname($file);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return;
    }
    flock($handle, LOCK_EX);
    $times = throttle_recent();
    $times[] = time();
    ftruncate($handle, 0);
    fwrite($handle, implode("\n", $times) . "\n");
    flock($handle, LOCK_UN);
    fclose($handle);
    // Housekeeping: drop files of other IPs that have been quiet for a day.
    if (random_int(1, 50) === 1) {
        foreach (glob($dir . '/*.txt') ?: [] as $old) {
            if (filemtime($old) < time() - 86400) {
                @unlink($old);
            }
        }
    }
}

function throttle_check(): void
{
    if (count(throttle_recent()) >= BRUSH_THROTTLE_MAX) {
        respond_error(429, 'too_many_attempts', [], ['Retry-After' => (string) BRUSH_THROTTLE_WINDOW]);
    }
}

/** Requires a bearer key whose SHA-256 matches the configured hash, else 429 / 401. */
function require_key(string $configHashName): void
{
    throttle_check();
    $token = bearer_token();
    $expected = (string) (brush_config()[$configHashName] ?? '');
    if ($token === null) {
        respond_error(401, 'unauthorized');
    }
    if ($expected === '' || !hash_equals($expected, hash('sha256', $token))) {
        throttle_register_failure();
        respond_error(401, 'unauthorized');
    }
}
