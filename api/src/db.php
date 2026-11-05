<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = brush_config()['db'];
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $c['host'], $c['name']);
        $pdo = new PDO($dsn, $c['user'], $c['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        $pdo->exec("SET time_zone = '+00:00'");
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

function applied_migrations(PDO $pdo): array
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (
           name VARCHAR(100) NOT NULL PRIMARY KEY,
           applied_at DATETIME(3) NOT NULL
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
    );
    return $pdo->query('SELECT name FROM schema_migrations ORDER BY name')->fetchAll(PDO::FETCH_COLUMN);
}

/** Applies pending migrations in order. Returns the names applied by this call. */
function run_migrations(PDO $pdo): array
{
    $lock = $pdo->query("SELECT GET_LOCK('brush_migrate', 10)")->fetchColumn();
    if ((int) $lock !== 1) {
        throw new RuntimeException('could not get the migration lock');
    }
    try {
        $done = array_flip(applied_migrations($pdo));
        $applied = [];
        foreach (migration_files() as $file) {
            $name = basename($file, '.sql');
            if (isset($done[$name])) {
                continue;
            }
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
