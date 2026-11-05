-- One shared JSON document. The row with id 1 always exists; version 0 means "never saved".
CREATE TABLE IF NOT EXISTS state (
  id          TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  data        JSON NOT NULL,
  version     INT UNSIGNED NOT NULL,
  updated_at  DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO state (id, data, version, updated_at) VALUES (1, 'null', 0, UTC_TIMESTAMP(3));
