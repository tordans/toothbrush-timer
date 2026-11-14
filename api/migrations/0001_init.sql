-- One row per family. The key of a family is never stored, only its SHA-256 hex digest; a request
-- finds its family by the digest of its Bearer key (the UNIQUE index). `data` is the state document
-- as JSON text, returned unchanged, and NULL until the first save. `version` counts saves (0 until
-- then) and is what If-Match refers to. All times are UTC with milliseconds.
-- Migrations must be safe to run twice (IF NOT EXISTS): MariaDB DDL is not transactional.
CREATE TABLE IF NOT EXISTS families (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  key_sha256  CHAR(64) NOT NULL,
  data        LONGTEXT NULL,
  version     INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME(3) NOT NULL,
  updated_at  DATETIME(3) NULL,
  UNIQUE KEY uq_families_key (key_sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Failed invite attempts, kept for one hour. ip_hash is an HMAC of the IP address with a salt that
-- changes every UTC day, so no plain IP address is ever stored.
CREATE TABLE IF NOT EXISTS invite_attempts (
  ip_hash       CHAR(64) NOT NULL,
  attempted_at  DATETIME(3) NOT NULL,
  KEY idx_invite_attempts_ip (ip_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
