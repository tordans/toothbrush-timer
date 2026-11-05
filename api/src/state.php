<?php
declare(strict_types=1);

/**
 * The stored document is kept as raw JSON text, so reads never re-encode it.
 * Returns ['data' => <json text>, 'version' => int, 'updated_at' => ?string].
 */
function state_read(PDO $pdo, bool $forUpdate = false): array
{
    $row = $pdo->query('SELECT data, version, updated_at FROM state WHERE id = 1' . ($forUpdate ? ' FOR UPDATE' : ''))->fetch();
    if (!$row) {
        return ['data' => 'null', 'version' => 0, 'updated_at' => null];
    }
    $version = (int) $row['version'];
    return [
        'data' => (string) $row['data'],
        'version' => $version,
        'updated_at' => $version === 0 ? null : iso_from_db((string) $row['updated_at']),
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
 * Replaces the document if the stored version equals $ifMatch.
 * Returns ['ok' => true, 'version' => int, 'updated_at' => string] or ['ok' => false, 'state' => array].
 */
function state_write(PDO $pdo, int $ifMatch, string $dataJson): array
{
    $pdo->exec("INSERT IGNORE INTO state (id, data, version, updated_at) VALUES (1, 'null', 0, UTC_TIMESTAMP(3))");
    $pdo->beginTransaction();
    try {
        $current = state_read($pdo, true);
        if ($current['version'] !== $ifMatch) {
            $pdo->rollBack();
            return ['ok' => false, 'state' => $current];
        }
        $stmt = $pdo->prepare('UPDATE state SET data = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3) WHERE id = 1');
        $stmt->execute([$dataJson]);
        $new = state_read($pdo);
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
