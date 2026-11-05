#!/bin/sh
# Apply migrations (the database may need a moment), then start Apache.
set -e

i=0
until php -d display_errors=1 -r 'define("BRUSH_NO_DISPATCH", 1); require "/srv/brush/api/src/bootstrap.php"; echo "migrations applied: ", json_encode(run_migrations(db())), "\n";'; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "migrations failed" >&2
    exit 1
  fi
  sleep 1
done

# Logs are written by www-data
chown -R www-data:www-data /srv/brush/logs
exec docker-php-entrypoint "$@"
