<?php
declare(strict_types=1);

const BRUSH_INVITE_MAX_FAILED_PER_HOUR = 10; // failed invite attempts per IP hash and hour
const BRUSH_MAX_NEW_FAMILIES_PER_DAY = 5;    // new families in the last 24 hours, all visitors together
const BRUSH_MAX_FAMILIES = 100;              // families in total

/**
 * Hash of the visitor's IP address with a salt that is different every UTC day and unknown without
 * the secret in config.php. The plain address is never stored.
 */
function invite_ip_hash(): string
{
    $secret = (string) (brush_config()['ip_salt_secret'] ?? '');
    if ($secret === '') {
        throw new RuntimeException('ip_salt_secret is not configured');
    }
    $salt = hash_hmac('sha256', gmdate('Y-m-d'), $secret);
    return hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $salt);
}

function invite_matches(string $given): bool
{
    $expected = (string) (brush_config()['invite_sha256'] ?? '');
    return $given !== '' && $expected !== '' && hash_equals($expected, hash('sha256', $given));
}

function count_rows(PDO $pdo, string $sql, array $params = []): int
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int) $stmt->fetchColumn();
}

/**
 * POST /api/families { "invite": "<word>" } creates a family and returns its key once.
 * The counts below are not atomic: two requests at the very same moment may exceed a limit by one.
 */
function handle_families_create(): never
{
    $raw = read_body(4096);
    if ($raw === null) {
        respond_error(413, 'too_large');
    }
    $body = json_decode($raw, false, 8);
    if (!($body instanceof stdClass)) {
        respond_error(400, 'bad_request', ['message' => 'Body must be {"invite": "<word>"}']);
    }
    $given = isset($body->invite) && is_string($body->invite) ? $body->invite : '';

    $pdo = db();
    $ipHash = invite_ip_hash();

    $pdo->exec('DELETE FROM invite_attempts WHERE attempted_at < UTC_TIMESTAMP(3) - INTERVAL 1 HOUR');
    $failed = count_rows($pdo, 'SELECT COUNT(*) FROM invite_attempts WHERE ip_hash = ?', [$ipHash]);
    if ($failed >= BRUSH_INVITE_MAX_FAILED_PER_HOUR) {
        respond_error(429, 'too_many_attempts', [], ['Retry-After' => '3600']);
    }

    if (!invite_matches($given)) {
        $pdo->prepare('INSERT INTO invite_attempts (ip_hash, attempted_at) VALUES (?, UTC_TIMESTAMP(3))')->execute([$ipHash]);
        respond_error(403, 'invalid_invite');
    }

    if (count_rows($pdo, 'SELECT COUNT(*) FROM families') >= BRUSH_MAX_FAMILIES) {
        respond_error(503, 'families_full');
    }
    $today = count_rows($pdo, 'SELECT COUNT(*) FROM families WHERE created_at >= UTC_TIMESTAMP(3) - INTERVAL 1 DAY');
    if ($today >= BRUSH_MAX_NEW_FAMILIES_PER_DAY) {
        respond_error(429, 'too_many_new_families', [], ['Retry-After' => '86400']);
    }

    $key = generate_key();
    $pdo->prepare('INSERT INTO families (key_sha256, created_at) VALUES (?, UTC_TIMESTAMP(3))')->execute([key_hash($key)]);
    respond(201, ['key' => $key]);
}

/** POST /api/family/key: replaces the key of the family. The old key stops working at once. */
function handle_family_key_renew(array $family): never
{
    $key = generate_key();
    // Matching the old digest too: if two renewals race, only one wins and the other gets 401.
    $stmt = db()->prepare('UPDATE families SET key_sha256 = ? WHERE id = ? AND key_sha256 = ?');
    $stmt->execute([key_hash($key), $family['id'], $family['key_sha256']]);
    if ($stmt->rowCount() !== 1) {
        respond_error(401, 'unauthorized');
    }
    respond(200, ['key' => $key]);
}
