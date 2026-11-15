-- Reward photos of a family. Only the metadata is stored here; the image file lives outside the
-- document root in data/photos/<family_id>/<id>.jpg|.webp. `id` is 22 characters of base64url
-- (16 random bytes) and is also the file name. A photo never changes, so there is no updated_at.
-- Deleting a family removes its rows (ON DELETE CASCADE) but not its files: delete
-- data/photos/<family_id>/ by hand. All times are UTC with milliseconds.
-- Migrations must be safe to run twice (IF NOT EXISTS): MariaDB DDL is not transactional.
CREATE TABLE IF NOT EXISTS photos (
  id          CHAR(22) NOT NULL PRIMARY KEY,
  family_id   INT UNSIGNED NOT NULL,
  type        VARCHAR(16) NOT NULL,
  width       SMALLINT UNSIGNED NOT NULL,
  height      SMALLINT UNSIGNED NOT NULL,
  bytes       INT UNSIGNED NOT NULL,
  created_at  DATETIME(3) NOT NULL,
  KEY idx_photos_family (family_id, created_at),
  CONSTRAINT fk_photos_family FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
