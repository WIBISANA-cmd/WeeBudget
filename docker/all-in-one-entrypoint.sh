#!/usr/bin/env sh
set -eu

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache database

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
  DB_FILE="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
  mkdir -p "$(dirname "$DB_FILE")"
  touch "$DB_FILE"
fi

chown -R www-data:www-data storage bootstrap/cache database public/app

php artisan package:discover --ansi

if [ "${APP_ENV:-production}" = "production" ]; then
  php artisan config:cache
fi

php artisan migrate --force

if [ -n "${WEEB_ADMIN_EMAIL:-}" ] && [ -n "${WEEB_ADMIN_PASSWORD:-}" ]; then
  php artisan db:seed --class=AdminUserSeeder --force
fi

php artisan schedule:work &
# artisan serve is single-process by default: one slow request stalls every user.
# ponytail: php-fpm (or Octane) is the real fix once traffic outgrows a handful of workers.
PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-4}" php artisan serve --no-reload --host=127.0.0.1 --port=8000 &

exec nginx -g "daemon off;"
