<?php
declare(strict_types=1);

/** Image types a photo may have, with the file extension used on disk. */
const BRUSH_PHOTO_TYPES = ['image/jpeg' => 'jpg', 'image/webp' => 'webp'];

/** The photo as the API shows it. Takes a database row. */
function photo_json(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'width' => (int) $row['width'],
        'height' => (int) $row['height'],
        'bytes' => (int) $row['bytes'],
        'type' => (string) $row['type'],
        'created_at' => iso_from_db((string) $row['created_at']),
    ];
}

/** A new photo id: 16 random bytes as base64url (22 characters). */
function generate_photo_id(): string
{
    return rtrim(strtr(base64_encode(random_bytes(16)), '+/', '-_'), '=');
}

function is_photo_id(string $id): bool
{
    return preg_match('/^[A-Za-z0-9_-]{22}$/', $id) === 1;
}

function photos_dir(): string
{
    return BRUSH_ROOT . '/data/photos';
}

function photo_path(int $familyId, string $id, string $type): string
{
    return photos_dir() . '/' . $familyId . '/' . $id . '.' . BRUSH_PHOTO_TYPES[$type];
}

/** Creates the folder if needed. A new data/ folder gets an .htaccess that denies all web access. */
function ensure_dir(string $dir): void
{
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('cannot create ' . $dir);
    }
}

/** Writes the file atomically (temp file in the same folder, then rename). */
function photo_file_write(string $path, string $bytes): void
{
    $data = BRUSH_ROOT . '/data';
    ensure_dir(dirname($path));
    if (!is_file($data . '/.htaccess')) {
        file_put_contents($data . '/.htaccess', "Require all denied\n");
    }
    $tmp = $path . '.tmp';
    if (file_put_contents($tmp, $bytes, LOCK_EX) !== strlen($bytes) || !rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException('cannot write ' . $path);
    }
}

/**
 * Checks an uploaded image. Returns ['width' => int, 'height' => int] or an error message.
 * The type must match the real bytes (magic bytes and the image header), not just the header.
 */
function photo_inspect(string $bytes, string $type): array|string
{
    $magic = $type === 'image/jpeg'
        ? str_starts_with($bytes, "\xFF\xD8\xFF")
        : (strlen($bytes) > 12 && str_starts_with($bytes, 'RIFF') && substr($bytes, 8, 4) === 'WEBP');
    $info = $magic ? @getimagesizefromstring($bytes) : false;
    if ($info === false || $info['mime'] !== $type) {
        return 'The body is not a valid ' . $type . ' image';
    }
    [$width, $height] = $info;
    if ($width < 1 || $height < 1 || $width > BRUSH_MAX_PHOTO_SIDE || $height > BRUSH_MAX_PHOTO_SIDE) {
        return 'Width and height must be between 1 and ' . BRUSH_MAX_PHOTO_SIDE . ' pixels';
    }
    return ['width' => $width, 'height' => $height];
}

/**
 * Inserts the row unless the family already has BRUSH_MAX_PHOTOS. The family row is locked, so two
 * uploads at the same moment cannot both pass the limit. Returns the row, or null if full.
 */
function photo_insert(PDO $pdo, int $familyId, array $photo): ?array
{
    $pdo->beginTransaction();
    try {
        $pdo->prepare('SELECT id FROM families WHERE id = ? FOR UPDATE')->execute([$familyId]);
        if (count_rows($pdo, 'SELECT COUNT(*) FROM photos WHERE family_id = ?', [$familyId]) >= BRUSH_MAX_PHOTOS) {
            $pdo->rollBack();
            return null;
        }
        $pdo->prepare(
            'INSERT INTO photos (id, family_id, type, width, height, bytes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))',
        )->execute([$photo['id'], $familyId, $photo['type'], $photo['width'], $photo['height'], $photo['bytes']]);
        $row = photo_find($pdo, $familyId, $photo['id']);
        $pdo->commit();
        return $row;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

/** The row of a photo of this family, or null. Other families' photos are never found. */
function photo_find(PDO $pdo, int $familyId, string $id): ?array
{
    $stmt = $pdo->prepare('SELECT id, type, width, height, bytes, created_at FROM photos WHERE id = ? AND family_id = ?');
    $stmt->execute([$id, $familyId]);
    return $stmt->fetch() ?: null;
}

/** GET /api/photos: all photos of the family, oldest first. */
function handle_photos_list(array $family): never
{
    $stmt = db()->prepare('SELECT id, type, width, height, bytes, created_at FROM photos WHERE family_id = ? ORDER BY created_at, id');
    $stmt->execute([$family['id']]);
    respond(200, ['photos' => array_map('photo_json', $stmt->fetchAll())]);
}

/** POST /api/photos: the body is the image itself. (PHP puts Content-Type in CONTENT_TYPE, not HTTP_*.) */
function handle_photos_create(array $family): never
{
    $type = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
    if (!isset(BRUSH_PHOTO_TYPES[$type])) {
        respond_error(415, 'unsupported_type', ['message' => 'Content-Type must be image/jpeg or image/webp']);
    }
    $bytes = read_body(BRUSH_MAX_PHOTO_BYTES) ?? respond_error(413, 'too_large');
    $size = photo_inspect($bytes, $type);
    if (is_string($size)) {
        respond_error(415, 'unsupported_type', ['message' => $size]);
    }

    $photo = ['id' => generate_photo_id(), 'type' => $type, 'bytes' => strlen($bytes)] + $size;
    $path = photo_path($family['id'], $photo['id'], $type);
    photo_file_write($path, $bytes);
    try {
        $row = photo_insert(db(), $family['id'], $photo);
    } catch (Throwable $e) {
        @unlink($path);
        throw $e;
    }
    if ($row === null) {
        @unlink($path);
        respond_error(409, 'too_many_photos', ['message' => 'At most ' . BRUSH_MAX_PHOTOS . ' photos per family']);
    }
    respond(201, photo_json($row));
}

/** GET /api/photos/{id}: the image bytes. Photos never change, so they can be cached for good. */
function handle_photo_get(array $family, string $id): never
{
    $row = photo_find(db(), $family['id'], $id) ?? respond_error(404, 'not_found');
    $path = photo_path($family['id'], $id, (string) $row['type']);
    if (!is_file($path)) {
        log_line('photo file missing for family ' . $family['id'] . ': ' . $id);
        respond_error(404, 'not_found');
    }
    http_response_code(200);
    header('Content-Type: ' . $row['type']);
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: private, max-age=31536000, immutable');
    header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: inline');
    readfile($path);
    exit;
}

/** DELETE /api/photos/{id}: removes the row first, then the file. */
function handle_photo_delete(array $family, string $id): never
{
    $pdo = db();
    $row = photo_find($pdo, $family['id'], $id) ?? respond_error(404, 'not_found');
    $pdo->prepare('DELETE FROM photos WHERE id = ? AND family_id = ?')->execute([$id, $family['id']]);
    if (!@unlink(photo_path($family['id'], $id, (string) $row['type']))) {
        log_line('photo file could not be removed for family ' . $family['id'] . ': ' . $id);
    }
    http_response_code(204);
    header('Cache-Control: no-store');
    exit;
}
