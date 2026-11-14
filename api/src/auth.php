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

/** SHA-256 hex of a family key. Only this is stored, never the key. */
function key_hash(string $key): string
{
    return hash('sha256', $key);
}

/** A new family key: 32 random bytes as base64url (43 characters). */
function generate_key(): string
{
    return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
}

/**
 * Finds the family of the bearer key. Returns its row ['id' => int, 'key_sha256' => string].
 * Answers 429 for an IP with too many wrong keys, 401 for a missing or unknown key.
 */
function require_family(): array
{
    throttle_check();
    $token = bearer_token();
    if ($token === null) {
        respond_error(401, 'unauthorized');
    }
    $stmt = db()->prepare('SELECT id, key_sha256 FROM families WHERE key_sha256 = ?');
    $stmt->execute([key_hash($token)]);
    $family = $stmt->fetch();
    if (!$family) {
        throttle_register_failure();
        respond_error(401, 'unauthorized');
    }
    return ['id' => (int) $family['id'], 'key_sha256' => (string) $family['key_sha256']];
}
