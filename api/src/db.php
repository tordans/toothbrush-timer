<?php
declare(strict_types=1);

/**
 * The database connection, with pending migrations applied. Only routes that need the database
 * call this, never /api/health. Runs once per request; when nothing is pending the migration check
 * costs two cheap queries.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = brush_config()['db'];
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $c['host'], $c['name']);
        $connection = new PDO($dsn, $c['user'], $c['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        $connection->exec("SET time_zone = '+00:00'");
        run_migrations($connection);
        $pdo = $connection;
    }
    return $pdo;
}

/** Splits a migration file into statements (";" at the end of a line, "--" comment lines dropped). */
function split_sql(string $sql): array
{
    $statements = [];
    $current = '';
    foreach (preg_split('/\R/', $sql) ?: [] as $line) {
        if (str_starts_with(ltrim($line), '--')) {
            continue;
        }
        $current .= $line . "\n";
        if (str_ends_with(rtrim($line), ';')) {
            $statements[] = trim($current);
            $current = '';
        }
    }
    if (trim($current) !== '') {
        $statements[] = trim($current);
    }
    return $statements;
}

function migration_files(): array
{
    $files = glob(BRUSH_ROOT . '/api/migrations/*.sql') ?: [];
    sort($files, SORT_STRING);
    return $files;
}

/** Names of the migration files that are not yet recorded in schema_migrations. */
function pending_migrations(PDO $pdo): array
{
    $done = array_flip($pdo->query('SELECT name FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN));
    $pending = [];
    foreach (migration_files() as $file) {
        if (!isset($done[basename($file, '.sql')])) {
            $pending[] = $file;
        }
    }
    return $pending;
}

/**
 * Applies pending migrations in order. Returns the names applied by this call. Concurrent requests
 * wait for each other with a named lock, so every migration runs once.
 */
function run_migrations(PDO $pdo): array
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (
           name VARCHAR(100) NOT NULL PRIMARY KEY,
           applied_at DATETIME(3) NOT NULL
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
    );
    if (pending_migrations($pdo) === []) {
        return [];
    }

    $lock = $pdo->query("SELECT GET_LOCK('brush_migrate', 30)")->fetchColumn();
    if ((int) $lock !== 1) {
        throw new RuntimeException('could not get the migration lock');
    }
    try {
        $applied = [];
        // Read again: another request may have applied them while we waited for the lock.
        foreach (pending_migrations($pdo) as $file) {
            $name = basename($file, '.sql');
            foreach (split_sql((string) file_get_contents($file)) as $statement) {
                $pdo->exec($statement);
            }
            $stmt = $pdo->prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, UTC_TIMESTAMP(3))');
            $stmt->execute([$name]);
            $applied[] = $name;
        }
        return $applied;
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('brush_migrate')");
    }
}
