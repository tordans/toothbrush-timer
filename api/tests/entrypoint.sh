#!/bin/sh
# Start Apache. The API applies its migrations itself on the first request that needs the database.
set -e

# Logs are written by www-data
chown -R www-data:www-data /srv/brush/logs
exec docker-php-entrypoint "$@"
