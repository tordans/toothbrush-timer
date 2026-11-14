<?php
declare(strict_types=1);

/**
 * The stored document of a family, kept as raw JSON text so reads never re-encode it.
 * Returns ['data' => <json text>, 'version' => int, 'updated_at' => ?string], or null if the
 * family does not exist (deleted by hand while the request ran).
 */
function state_read(PDO $pdo, int $familyId, bool $forUpdate = false): ?array
{
    $stmt = $pdo->prepare('SELECT data, version, updated_at FROM families WHERE id = ?' . ($forUpdate ? ' FOR UPDATE' : ''));
    $stmt->execute([$familyId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $version = (int) $row['version'];
    if ($version === 0 || $row['data'] === null) {
        return ['data' => 'null', 'version' => 0, 'updated_at' => null];
    }
    return [
        'data' => (string) $row['data'],
        'version' => $version,
        'updated_at' => iso_from_db((string) $row['updated_at']),
    ];
}

/** JSON text for { data, version, updated_at } (plus extra fields). */
function state_json(array $state, array $extra = []): string
{
    $head = '';
    foreach ($extra as $key => $value) {
        $head .= json_encode_api($key) . ':' . json_encode_api($value) . ',';
    }
    return '{' . $head . '"data":' . $state['data'] . ',"version":' . $state['version']
        . ',"updated_at":' . json_encode_api($state['updated_at']) . '}';
}

/**
 * Replaces the document of the family if its stored version equals $ifMatch.
 * Returns ['ok' => true, 'version' => int, 'updated_at' => string], ['ok' => false, 'state' => array]
 * for a version conflict, or null if the family no longer exists.
 */
function state_write(PDO $pdo, int $familyId, int $ifMatch, string $dataJson): ?array
{
    $pdo->beginTransaction();
    try {
        $current = state_read($pdo, $familyId, true);
        if ($current === null) {
            $pdo->rollBack();
            return null;
        }
        if ($current['version'] !== $ifMatch) {
            $pdo->rollBack();
            return ['ok' => false, 'state' => $current];
        }
        $stmt = $pdo->prepare('UPDATE families SET data = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3) WHERE id = ?');
        $stmt->execute([$dataJson, $familyId]);
        $new = state_read($pdo, $familyId);
        $pdo->commit();
        return ['ok' => true, 'version' => $new['version'], 'updated_at' => $new['updated_at']];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

/** Parses an If-Match value like "3", 3 or W/"3". */
function parse_if_match(string $value): ?int
{
    if (!preg_match('/^\s*(?:W\/)?"?(\d{1,10})"?\s*$/', $value, $m)) {
        return null;
    }
    return (int) $m[1];
}

/**
 * Validates a decoded request body ({ data: object }) and returns the data as JSON text.
 * Responds with 400 / 413 itself.
 */
function state_data_from_body(?string $raw): string
{
    if ($raw === null) {
        respond_error(413, 'too_large');
    }
    $body = json_decode($raw, false, 64);
    if (!($body instanceof stdClass) || !property_exists($body, 'data') || !($body->data instanceof stdClass)) {
        respond_error(400, 'bad_request', ['message' => 'Body must be {"data": <object>}']);
    }
    $json = json_encode_api($body->data);
    if (strlen($json) > BRUSH_MAX_DATA_BYTES) {
        respond_error(413, 'too_large');
    }
    return $json;
}
