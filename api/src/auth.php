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

/**
 * Hash of the visitor's IP address with a salt that is different every UTC day and unknown without
 * the secret in config.php. The plain address is never stored.
 */
function ip_hash(): string
{
    $secret = (string) (brush_config()['ip_salt_secret'] ?? '');
    if ($secret === '') {
        throw new RuntimeException('ip_salt_secret is not configured');
    }
    $salt = hash_hmac('sha256', gmdate('Y-m-d'), $secret);
    return hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $salt);
}

function throttle_file(): string
{
    return BRUSH_ROOT . '/logs/throttle/' . ip_hash() . '.txt';
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

const BRUSH_PASSPHRASE_WORDS = 6; // words per new family key

/**
 * A new family key: a passphrase of random German words joined by '-', e.g. "tanne-mond-kiesel-...".
 * It is the one and only secret of the family (the same string goes into the link after #key=), but
 * a parent can read it out and type it on another device. 6 words from a list of 1000+ are about
 * 60 bits; wrong keys are throttled per IP (see throttle_check), so guessing is not feasible.
 * Words are drawn independently with the CSPRNG, so the entropy is exactly words * log2(list size).
 *
 * Keys made before this change are 43 random base64url characters. They are still looked up by the
 * same SHA-256 and keep working: nothing in require_family() depends on the format.
 */
function generate_key(): string
{
    /** @var list<string> $words */
    static $words = null;
    $words ??= require __DIR__ . '/wordlist.php';
    $last = count($words) - 1;
    $picked = [];
    for ($i = 0; $i < BRUSH_PASSPHRASE_WORDS; $i++) {
        $picked[] = $words[random_int(0, $last)];
    }
    return implode('-', $picked);
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
