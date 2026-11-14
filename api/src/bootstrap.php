<?php
// Loads the API code and handles the current request.
declare(strict_types=1);

// Server layout: <root>/{config,api/src,api/migrations,logs,public}
define('BRUSH_ROOT', dirname(__DIR__, 2));
const BRUSH_MAX_DATA_BYTES = 262144; // 256 KiB for the state document

require __DIR__ . '/http.php';
require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/families.php';
require __DIR__ . '/state.php';
require __DIR__ . '/router.php';

if (PHP_SAPI !== 'cli' && !defined('BRUSH_NO_DISPATCH')) {
    brush_handle_request();
}
